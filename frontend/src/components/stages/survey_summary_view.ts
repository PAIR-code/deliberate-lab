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

/** Survey stage summary view for participant profile */
@customElement('survey-summary-view')
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

    return html`
      <div class="questions-preview-wrapper">
        ${this.stage.questions.map((question) => this.renderQuestion(question))}
      </div>
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
            disabled
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
        ${textAnswer.trim().length > 0
          ? html`<div>${textAnswer}</div>`
          : html`<div class="empty-message">No answer yet</div>`}
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
        <div class=${titleClasses}>
          ${unsafeHTML(convertMarkdownToHTML(question.questionTitle + "*"))}
        </div>
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

    return html`
      <div class="radio-button">
        <md-radio
          id=${id}
          name=${questionId}
          value=${choice.id}
          aria-label=${choice.text}
          ?checked=${this.isMultipleChoiceMatch(questionId, choice.id)}
          disabled
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

    return html`
      <div class="scale-button">
        <md-radio
          id=${id}
          name=${name}
          value=${value}
          ?checked=${isScaleChoiceMatch(value)}
          disabled
        >
        </md-radio>
        <label for=${id}>${value}</label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-summary-view': SurveyView;
  }
}
