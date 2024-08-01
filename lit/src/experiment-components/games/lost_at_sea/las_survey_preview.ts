import '../../../pair-components/textarea';

import '../../footer/footer';
import '../../progress/progress_stage_completed';

import '@material/web/radio/radio.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {
  ITEMS,
  ItemName,
  LostAtSeaQuestion,
  LostAtSeaQuestionAnswer,
  LostAtSeaSurveyStageAnswer,
  LostAtSeaSurveyStageConfig,
} from '@llm-mediation-experiments/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {core} from '../../../core/core';
import {ParticipantService} from '../../../services/participant_service';
import {convertMarkdownToHTML} from '../../../shared/utils';
import {styles} from './las_survey_preview.scss';

/** Lost at Sea survey preview */
@customElement('las-survey-preview')
export class SurveyPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: LostAtSeaSurveyStageConfig | null = null;
  @property() answer: LostAtSeaSurveyStageAnswer | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const ratingsComplete = () => {
      const answerMap = this.answer?.answers;
      const answerList = answerMap ? Object.values(answerMap) : [];

      if (answerList.length != this.stage?.questions.length) {
        return false;
      }

      // Confirm that user has selected confidence for each question
      for (const answer of answerList) {
        if (!answer.confidence) {
          return false;
        }
      }
      return true;
    };

    const descriptionContent = this.stage.description
      ? html`<div class="description">
          ${unsafeHTML(convertMarkdownToHTML(this.stage.description))}
        </div>`
      : nothing;

    return html`
      ${descriptionContent}

      <div class="questions-wrapper">
        ${this.stage.questions.map((question) => this.renderQuestion(question))}
      </div>
      <stage-footer .disabled=${!ratingsComplete()}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderQuestion(question: LostAtSeaQuestion) {
    const onSelect = (choice: ItemName) => {
      // If disabled
      if (!this.participantService.isCurrentStage()) {
        return;
      }

      const confidence = this.getQuestionConfidence(question);
      const answer: LostAtSeaQuestionAnswer = confidence
        ? {
            id: question.id,
            choice,
            confidence: this.getQuestionConfidence(question),
          }
        : {
            id: question.id,
            choice,
          };

      this.participantService.updateLostAtSeaSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    const isMatch = (item: string) => {
      const questionAnswer = this.answer?.answers[question.id];

      if (questionAnswer) {
        return questionAnswer.choice === item;
      }

      return false;
    };

    const getClassMap = (item: string) => {
      return classMap({
        question: true,
        selected: isMatch(item),
        disabled: !this.participantService.isCurrentStage(),
      });
    };

    return html`
      <div class="survey-question">
        <div class="question-title">${question.questionText}</div>
        <div class="question-wrapper">
          <div
            class=${getClassMap(question.item1)}
            @click=${() => {
              onSelect(question.item1);
            }}
          >
            <div class="img-wrapper">
              <img src=${ITEMS[question.item1].imageUrl} />
            </div>
            <div class="radio-button">
              <md-radio
                id="${question.id}-1"
                name=${question.id}
                value="1"
                aria-label=${ITEMS[question.item1].name}
                ?checked=${isMatch(question.item1)}
                ?disabled=${!this.participantService.isCurrentStage()}
              >
              </md-radio>
              <label for="1">${ITEMS[question.item1].name}</label>
            </div>
          </div>
          <div
            class=${getClassMap(question.item2)}
            @click=${() => {
              onSelect(question.item2);
            }}
          >
            <div class="img-wrapper">
              <img src=${ITEMS[question.item2].imageUrl} />
            </div>
            <div class="radio-button">
              <md-radio
                id="${question.id}-2"
                name=${question.id}
                value="2"
                aria-label=${ITEMS[question.item2].name}
                ?checked=${isMatch(question.item2)}
                ?disabled=${!this.participantService.isCurrentStage()}
              >
              </md-radio>
              <label for="2">${ITEMS[question.item2].name}</label>
            </div>
          </div>
        </div>
        ${this.renderConfidenceScale(question)}
      </div>
    `;
  }

  private getQuestionChoice(question: LostAtSeaQuestion) {
    const questionAnswer = this.answer?.answers[question.id];

    if (questionAnswer) {
      return questionAnswer.choice;
    }

    return undefined;
  }

  private getQuestionConfidence(question: LostAtSeaQuestion) {
    const questionAnswer = this.answer?.answers[question.id];

    if (questionAnswer) {
      return questionAnswer.confidence;
    }

    return undefined;
  }

  private renderConfidenceScale(question: LostAtSeaQuestion) {
    const scale = [...Array(11).keys()];

    return html`
      <div class="confidence-question">
        <div class="title">
          How confident are you that your answer is correct?
        </div>
        <div class="confidence-scale labels">
          <div>Not confident</div>
          <div>Very confident</div>
        </div>
        <div class="confidence-scale values">
          ${scale.map((num) => this.renderConfidenceRadioButton(question, num))}
        </div>
      </div>
    `;
  }

  private renderConfidenceRadioButton(
    question: LostAtSeaQuestion,
    value: number
  ) {
    const name = `${question.id}-confidence`;
    const id = `${question.id}-confidence-${value}`;

    const isConfidenceChoiceMatch = (value: number) => {
      const questionAnswer = this.answer?.answers[question.id];

      if (questionAnswer) {
        return questionAnswer.confidence === value;
      }
      return false;
    };

    const handleConfidenceClick = (e: Event) => {
      const confidence = Number((e.target as HTMLInputElement).value);

      const choice = this.getQuestionChoice(question);

      if (!choice) {
        return;
      }

      const answer: LostAtSeaQuestionAnswer = {
        id: question.id,
        choice,
        confidence,
      };

      this.participantService.updateLostAtSeaSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    return html`
      <div class="confidence-button">
        <md-radio
          id=${id}
          name=${name}
          value=${value}
          aria-label=${value}
          ?checked=${isConfidenceChoiceMatch(value)}
          ?disabled=${!this.participantService.isCurrentStage() ||
          !this.answer?.answers[question.id]}
          @change=${handleConfidenceClick}
        >
        </md-radio>
        <label for=${id}>${value}</label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'las-survey-preview': SurveyPreview;
  }
}
