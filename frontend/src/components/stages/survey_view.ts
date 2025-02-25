import '../../pair-components/textarea';

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
  SurveyQuestion,
  ScaleSurveyAnswer,
  ScaleSurveyQuestion,
  SurveyQuestionKind,
  SurveyAnswer,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  TextSurveyAnswer,
  TextSurveyQuestion,
  isMultipleChoiceImageQuestion,
} from '@deliberation-lab/utils';
import {
  isSurveyComplete,
  isSurveyAnswerComplete,
} from '../../shared/stage.utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {styles} from './survey_view.scss';

/** Survey stage view for participants */
@customElement('survey-view')
export class SurveyView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property() stage: SurveyStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const questionsComplete = (): boolean => {
      if (!this.stage) return false;
      return isSurveyComplete(
        this.stage.questions,
        this.participantAnswerService.getSurveyAnswerMap(this.stage.id),
      );
    };

    const saveAnswers = async () => {
      if (!this.stage) return;

      // Save all answers for this stage
      await this.participantAnswerService.saveSurveyAnswers(this.stage.id);
      await this.participantService.progressToNextStage();
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="questions-wrapper">
        ${this.stage.questions.map((question) => this.renderQuestion(question))}
      </div>
      <stage-footer
        .disabled=${!questionsComplete()}
        .onNextClick=${saveAnswers}
      >
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderQuestion(question: SurveyQuestion) {
    switch (question.kind) {
      case SurveyQuestionKind.CHECK:
        return this.renderCheckQuestion(question);
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        return this.renderMultipleChoiceQuestion(question);
      case SurveyQuestionKind.SCALE:
        return this.renderScaleQuestion(question);
      case SurveyQuestionKind.TEXT:
        return this.renderTextQuestion(question);
      default:
        return nothing;
    }
  }

  private renderCheckQuestion(question: CheckSurveyQuestion) {
    const isChecked = () => {
      if (!this.stage) return;
      const answer = this.participantAnswerService.getSurveyAnswer(
        this.stage.id,
        question.id,
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
      this.participantAnswerService.updateSurveyAnswer(this.stage.id, answer);
    };

    const titleClasses = classMap({
      required: question.isRequired && !isChecked(),
    });

    return html`
      <div class="question">
        <label class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            aria-label=${question.questionTitle}
            ?checked=${isChecked()}
            ?disabled=${this.participantService.disableStage}
            @click=${handleCheck}
          >
          </md-checkbox>
          <div class=${titleClasses}>
            ${unsafeHTML(convertMarkdownToHTML(question.questionTitle + "*"))}
          </div>
        </label>
      </div>
    `;
  }

  private renderTextQuestion(question: TextSurveyQuestion) {
    if (!this.stage) return;

    const handleTextChange = (e: Event) => {
      if (!this.stage) return;
      const answer = (e.target as HTMLInputElement).value ?? '';
      const textAnswer: TextSurveyAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.TEXT,
        answer,
      };
      this.participantAnswerService.updateSurveyAnswer(
        this.stage.id,
        textAnswer,
      );
    };

    const answer = this.participantAnswerService.getSurveyAnswer(
      this.stage.id,
      question.id,
    );
    const textAnswer =
      answer && answer.kind === SurveyQuestionKind.TEXT ? answer.answer : '';

    const titleClasses = classMap({
      required: !isSurveyAnswerComplete(answer),
    });

    return html`
      <div class="question">
        <div class=${titleClasses}>
          ${unsafeHTML(convertMarkdownToHTML(question.questionTitle + "*"))}
        </div>
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

  private renderMultipleChoiceQuestion(question: MultipleChoiceSurveyQuestion) {
    const questionWrapperClasses = classMap({
      'radio-question-wrapper': true,
      image: isMultipleChoiceImageQuestion(question),
    });

    const titleClasses = classMap({
      required: !isSurveyAnswerComplete(
        this.participantAnswerService.getSurveyAnswer(
          this.stage?.id ?? '',
          question.id,
        ),
      ),
    });

    return html`
      <div class="radio-question">
        <div class=${titleClasses}>${question.questionTitle}*</div>
        <div class=${questionWrapperClasses}>
          ${question.options.map((option) =>
            this.renderRadioButton(option, question.id),
          )}
        </div>
      </div>
    `;
  }

  private isMultipleChoiceMatch(questionId: string, choiceId: string) {
    if (!this.stage) return;
    const answer = this.participantAnswerService.getSurveyAnswer(
      this.stage.id,
      questionId,
    );
    if (answer && answer.kind === SurveyQuestionKind.MULTIPLE_CHOICE) {
      return answer?.choiceId === choiceId;
    }
    return false;
  }

  private renderRadioButton(choice: MultipleChoiceItem, questionId: string) {
    const id = `${questionId}-${choice.id}`;

    const handleMultipleChoiceClick = (e: Event) => {
      const answer: MultipleChoiceSurveyAnswer = {
        id: questionId,
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        choiceId: choice.id,
      };
      // Update stage answer
      if (!this.stage) return;
      this.participantAnswerService.updateSurveyAnswer(this.stage.id, answer);
    };

    if (choice.imageId.length > 0) {
      const classes = classMap({
        'image-question': true,
        selected: this.isMultipleChoiceMatch(questionId, choice.id) ?? false,
        disabled: this.participantService.disableStage,
      });

      return html`
        <div class=${classes} @click=${handleMultipleChoiceClick}>
          <div class="img-wrapper">
            <img src=${choice.imageId} />
          </div>
          <div class="radio-button">
            <md-radio
              id=${id}
              name=${questionId}
              value=${choice.id}
              aria-label=${choice.text}
              ?checked=${this.isMultipleChoiceMatch(questionId, choice.id)}
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
          name=${questionId}
          value=${choice.id}
          aria-label=${choice.text}
          ?checked=${this.isMultipleChoiceMatch(questionId, choice.id)}
          ?disabled=${this.participantService.disableStage}
          @change=${handleMultipleChoiceClick}
        >
        </md-radio>
        <label for=${id}>${choice.text}</label>
      </div>
    `;
  }

  private renderScaleQuestion(question: ScaleSurveyQuestion) {
    const scale = [...Array(question.upperValue + 1).keys()].slice(
      question.lowerValue,
    );

    const titleClasses = classMap({
      required: !isSurveyAnswerComplete(
        this.participantAnswerService.getSurveyAnswer(
          this.stage?.id ?? '',
          question.id,
        ),
      ),
    });

    return html`
      <div class="question">
        <div class=${titleClasses}>
          ${unsafeHTML(convertMarkdownToHTML(question.questionTitle + "*"))}
        </div>
        <div class="scale labels">
          <div>${question.lowerText}</div>
          <div>${question.upperText}</div>
        </div>
        <div class="scale values">
          ${scale.map((num) => this.renderScaleRadioButton(question, num))}
        </div>
      </div>
    `;
  }

  private renderScaleRadioButton(question: ScaleSurveyQuestion, value: number) {
    const name = `${question.id}`;
    const id = `${question.id}-${value}`;

    const isScaleChoiceMatch = (value: number) => {
      if (!this.stage) return;
      const answer = this.participantAnswerService.getSurveyAnswer(
        this.stage.id,
        question.id,
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
      this.participantAnswerService.updateSurveyAnswer(this.stage.id, answer);
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
    'survey-view': SurveyView;
  }
}
