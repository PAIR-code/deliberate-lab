import '../../pair-components/textarea';

import '../participant_profile/profile_avatar';
import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import '@material/web/radio/radio.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {
  CheckSurveyAnswer,
  CheckSurveyQuestion,
  MultipleChoiceItem,
  MultipleChoiceSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  ParticipantProfile,
  ParticipantStatus,
  SurveyQuestion,
  ScaleSurveyAnswer,
  ScaleSurveyQuestion,
  SurveyQuestionKind,
  SurveyAnswer,
  SurveyPerParticipantStageConfig,
  SurveyStageParticipantAnswer,
  TextSurveyAnswer,
  TextSurveyQuestion,
  isMultipleChoiceImageQuestion,
} from '@deliberation-lab/utils';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ImageService} from '../../services/image.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  getParticipantName,
  getParticipantPronouns
} from '../../shared/participant.utils';

import {styles} from './survey_view.scss';

/** Survey per participant stage view for participants */
@customElement('survey-per-participant-view')
export class SurveyView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly imageService = core.getService(ImageService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService
  );

  private checkQuestions: string[] = [];

  @property() stage: SurveyPerParticipantStageConfig | undefined = undefined;
  @property() renderSummaryView: boolean = false; // If true, render a minimized summary view.

  private getRequiredQuestions() {
    return (
      this.stage!.questions.filter(
        (q) =>
          q.kind !== SurveyQuestionKind.CHECK ||
          (q.kind === SurveyQuestionKind.CHECK && q.isRequired)
      ).map((q) => q.id) ?? []
    );
  }

  private getParticipants() {
    if (!this.stage) return [];

    const allParticipants = this.cohortService.activeParticipants;
    if (this.stage.enableSelfSurvey) {
      return allParticipants;
    }
    return (
      allParticipants.filter(
        (profile) =>
          profile.publicId !== this.participantService.profile?.publicId
      ) ?? []
    );
  }

  private renderParticipant(profile: ParticipantProfile) {
    return html`
      <div class="item">
        <profile-avatar .emoji=${profile.avatar} .square=${true}>
        </profile-avatar>
        <div class="right">
          <div class="title">${getParticipantName(profile)}</div>
          <div class="subtitle">${getParticipantPronouns(profile)}</div>
          ${
            profile.publicId === this.participantService.profile?.publicId ?
            html`<div>(you)</div>` : nothing
          }
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const questionsComplete = (): boolean => {
      if (!this.stage) return false;
      const participants = this.getParticipants();

      for (const participant of participants) {
        const answeredQuestionIds = new Set(
          this.participantAnswerService.getSurveyPerParticipantAnswerIDs(
            this.stage.id, participant.publicId
          )
        );

        if (!this.getRequiredQuestions().every((id) =>
          answeredQuestionIds.has(id)
        )) {
          return false;
        }
      }

      return true;
    };

    const saveAnswers = async () => {
      if (!this.stage) return;

      // Populate default answers for optional questions.
      const requiredQuestionIds = this.getRequiredQuestions();
      const optionalQuestions = this.stage.questions.filter(
        (q) => !requiredQuestionIds.includes(q.id)
      );

      optionalQuestions.forEach((question) => {
        if (!this.stage) return;

        const participants = this.getParticipants();
        for (const participant of participants) {
          const answeredQuestionIDs =
            this.participantAnswerService.getSurveyPerParticipantAnswerIDs(
              this.stage.id, participant.publicId
            );

          if (!answeredQuestionIDs.includes(question.id)) {
            const answer: CheckSurveyAnswer = {
              id: question.id,
              kind: SurveyQuestionKind.CHECK,
              isChecked: false,
            };
            this.participantAnswerService.updateSurveyPerParticipantAnswer(
              this.stage!.id,
              answer,
              participant.publicId
            );
          }
        }
      });

      // Save all answers for this stage
      await this.participantAnswerService.saveSurveyPerParticipantAnswers(this.stage.id);
    };

    const wrapperStyle = this.renderSummaryView
      ? 'questions-wrapper-condensed'
      : 'questions-wrapper';
    return html`
      ${this.renderSummaryView
        ? ''
        : html`<stage-description .stage=${this.stage}></stage-description>`}
      <div class="${wrapperStyle}">
        ${this.stage.questions.map((question) => this.renderQuestion(question))}
      </div>
      ${this.renderSummaryView
        ? ''
        : html`<stage-footer
            .disabled=${!questionsComplete()}
            .onNextClick=${saveAnswers}
          >
            ${this.stage.progress.showParticipantProgress
              ? html`<progress-stage-completed></progress-stage-completed>`
              : nothing}
          </stage-footer>`}
    `;
  }

  private renderQuestion(question: SurveyQuestion) {
    const participants = this.getParticipants();
    switch (question.kind) {
      case SurveyQuestionKind.CHECK:
        return participants.map(
          participant => this.renderCheckQuestion(question, participant)
        );
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        return participants.map(
          participant => this.renderMultipleChoiceQuestion(question, participant)
        );
      case SurveyQuestionKind.SCALE:
        return participants.map(
          participant => this.renderScaleQuestion(question, participant)
        );
      case SurveyQuestionKind.TEXT:
        return participants.map(
          participant => this.renderTextQuestion(question, participant)
        );
      default:
        return nothing;
    }
  }

  private renderCheckQuestion(
    question: CheckSurveyQuestion,
    participant: ParticipantProfile
  ) {
    const isChecked = () => {
      if (!this.stage) return;
      // Get answer per participant
      const answer = this.participantAnswerService.getSurveyPerParticipantAnswer(
        this.stage.id,
        question.id,
        participant.publicId
      );
      if (answer && answer.kind === SurveyQuestionKind.CHECK) {
        return answer.isChecked;
      }
      return false;
    };

    const handleCheck = () => {
      const answer: CheckSurveyAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.CHECK,
        isChecked: !isChecked(),
      };
      // Update stage answer
      if (!this.stage) return;
      // Update survey answer accordingly
      this.participantAnswerService.updateSurveyPerParticipantAnswer(
        this.stage.id, answer, participant.publicId
      );
    };

    return html`
      <div class="question">
        ${this.renderParticipant(participant)}
        <label class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            aria-label=${question.questionTitle}
            ?checked=${isChecked()}
            ?disabled=${this.participantService.disableStage}
            @click=${handleCheck}
          >
          </md-checkbox>
          <div class="question-title">${question.questionTitle}</div>
        </label>
      </div>
    `;
  }

  private renderTextQuestion(
    question: TextSurveyQuestion,
    participant: ParticipantProfile
  ) {
    if (!this.stage) return;

    const handleTextChange = (e: Event) => {
      if (!this.stage) return;
      const answer = (e.target as HTMLInputElement).value ?? '';
      const textAnswer: TextSurveyAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.TEXT,
        answer,
      };
      // Update per participant
      this.participantAnswerService.updateSurveyPerParticipantAnswer(
        this.stage.id,
        textAnswer,
        participant.publicId
      );
    };

    // Get answer per participant
    const answer = this.participantAnswerService.getSurveyPerParticipantAnswer(
      this.stage.id,
      question.id,
      participant.publicId
    );
    const textAnswer =
      answer && answer.kind === SurveyQuestionKind.TEXT ? answer.answer : '';

    return html`
      <div class="question">
        <div class="question-title">${question.questionTitle}</div>
        ${this.renderParticipant(participant)}
        <pr-textarea
          variant="outlined"
          placeholder="Type your response"
          .value=${textAnswer}
          ?disabled=${this.participantService.disableStage}
          @change=${handleTextChange}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderMultipleChoiceQuestion(
    question: MultipleChoiceSurveyQuestion,
    participant: ParticipantProfile
  ) {
    const questionWrapperClasses = classMap({
      'radio-question-wrapper': true,
      image: isMultipleChoiceImageQuestion(question),
    });

    return html`
      <div class="radio-question">
        <div class="title">${question.questionTitle}</div>
        ${this.renderParticipant(participant)}
        <div class=${questionWrapperClasses}>
          ${question.options.map((option) =>
            this.renderRadioButton(option, question.id, participant.publicId)
          )}
        </div>
      </div>
    `;
  }

  private isMultipleChoiceMatch(
    questionId: string,
    choiceId: string,
    participantId: string,
  ) {
    if (!this.stage) return;
    // Get answer per participant
    const answer = this.participantAnswerService.getSurveyPerParticipantAnswer(
      this.stage.id,
      questionId,
      participantId
    );
    if (answer && answer.kind === SurveyQuestionKind.MULTIPLE_CHOICE) {
      return answer?.choiceId === choiceId;
    }
    return false;
  }

  private renderRadioButton(
    choice: MultipleChoiceItem,
    questionId: string,
    participantId: string,
  ) {
    const name = `${questionId}-${participantId}`
    const id = `${questionId}-${participantId}-${choice.id}`;

    const handleMultipleChoiceClick = (e: Event) => {
      const answer: MultipleChoiceSurveyAnswer = {
        id: questionId,
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        choiceId: choice.id,
      };
      // Update stage answer
      if (!this.stage) return;
      this.participantAnswerService.updateSurveyPerParticipantAnswer(
        this.stage.id, answer, participantId
      );
    };

    if (choice.imageId.length > 0) {
      const classes = classMap({
        'image-question': true,
        selected: this.isMultipleChoiceMatch(questionId, choice.id, participantId) ?? false,
        disabled: this.participantService.disableStage,
      });

      return html`
        <div class=${classes} @click=${handleMultipleChoiceClick}>
          <div class="img-wrapper">
            <img src=${this.imageService.getImageSrc(choice.imageId)} />
          </div>
          <div class="radio-button">
            <md-radio
              id=${id}
              name=${questionId}
              value=${choice.id}
              aria-label=${choice.text}
              ?checked=${this.isMultipleChoiceMatch(questionId, choice.id, participantId)}
              ?disabled=${this.participantService.disableStage}
            >
            </md-radio>
            <label for=${id}>${choice.text}</label>
          </div>
        </div>
      `;
    }

    return html`
      <div class="radio-button">
        <md-radio
          id=${id}
          name=${name}
          value=${choice.id}
          aria-label=${choice.text}
          ?checked=${this.isMultipleChoiceMatch(questionId, choice.id, participantId)}
          ?disabled=${this.participantService.disableStage}
          @change=${handleMultipleChoiceClick}
        >
        </md-radio>
        <label for=${id}>${choice.text}</label>
      </div>
    `;
  }

  private renderScaleQuestion(
    question: ScaleSurveyQuestion,
    participant: ParticipantProfile
  ) {
    const scale = [...Array(question.upperValue + 1).keys()].slice(
      question.lowerValue
    );
    return html`
      <div class="question">
        <div class="question-title">${question.questionTitle}</div>
        ${this.renderParticipant(participant)}
        <div class="scale labels">
          <div>${question.lowerText}</div>
          <div>${question.upperText}</div>
        </div>
        <div class="scale values">
          ${scale.map((num) => this.renderScaleRadioButton(question, num, participant.publicId))}
        </div>
      </div>
    `;
  }

  private renderScaleRadioButton(
    question: ScaleSurveyQuestion, value: number, participantId: string
  ) {
    const name = `${question.id}-${participantId}`;
    const id = `${question.id}-${participantId}-${value}`;

    const isScaleChoiceMatch = (value: number) => {
      if (!this.stage) return;
      // Get answer per participant
      const answer = this.participantAnswerService.getSurveyPerParticipantAnswer(
        this.stage.id,
        question.id,
        participantId
      );
      if (answer && answer.kind === SurveyQuestionKind.SCALE) {
        return answer.value === value;
      }
      return false;
    };

    const handleScaleClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const answer: ScaleSurveyAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.SCALE,
        value,
      };

      // Update stage answer
      if (!this.stage) return;
      this.participantAnswerService.updateSurveyPerParticipantAnswer(
        this.stage.id, answer, participantId
      );
    };

    return html`
      <div class="scale-button">
        <md-radio
          id=${id}
          name=${name}
          value=${value}
          ?checked=${isScaleChoiceMatch(value)}
          ?disabled=${this.participantService.disableStage}
          @change=${handleScaleClick}
        >
        </md-radio>
        <label for=${id}>${value}</label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-per-participant-view': SurveyView;
  }
}
