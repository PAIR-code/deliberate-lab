import '../progress/progress_stage_completed';

import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/radio/radio.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  ComprehensionStageConfig,
  ComprehensionQuestion,
  ComprehensionQuestionKind,
  MultipleChoiceComprehensionQuestion,
  TextComprehensionQuestion,
  MultipleChoiceItem,
} from '@deliberation-lab/utils';

import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {convertMarkdownToHTML} from '../../shared/utils';
import {styles} from './comprehension_view.scss';

/** Comprehension stage view for participants. */
@customElement('comprehension-participant-view')
export class ComprehensionView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property() stage: ComprehensionStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const checksComplete = (): boolean => {
      if (!this.stage) return false;
      for (const question of this.stage.questions) {
        if (!this.isCheckComplete(question)) {
          return false;
        }
      }
      return true;
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="stage-content">
        ${this.stage.questions.map((question) => this.renderQuestion(question))}
      </div>
      <stage-footer .disabled=${!checksComplete()}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderQuestion(question: ComprehensionQuestion) {
    const renderError = () => {
      if (!this.hasAnswer(question) || this.isCheckComplete(question)) {
        return nothing;
      }
      return html`
        <div class="error-text">
          This answer is incorrect. Please try again.
        </div>
      `;
    };

    switch (question.kind) {
      case ComprehensionQuestionKind.MULTIPLE_CHOICE:
        return html`
          <div class="question-wrapper">
            ${this.renderMultipleChoiceQuestion(question)} ${renderError()}
          </div>
        `;
      case ComprehensionQuestionKind.TEXT:
        return html`
          <div class="question-wrapper">
            ${this.renderTextQuestion(question)} ${renderError()}
          </div>
        `;
      default:
        return nothing;
    }
  }

  private renderMultipleChoiceQuestion(
    question: MultipleChoiceComprehensionQuestion,
  ) {
    return html`
      <div class="radio-question">
        <div class="radio-question-wrapper">
          ${unsafeHTML(convertMarkdownToHTML(question.questionTitle))}
        </div>
        <div class="radio-question-wrapper">
          ${question.options.map((option) =>
            this.renderRadioButton(option, question.id),
          )}
        </div>
      </div>
    `;
  }

  private isMultipleChoiceMatch(questionId: string, choiceId: string) {
    if (!this.stage) return;
    const answer = this.participantAnswerService.getComprehensionAnswer(
      this.stage.id,
      questionId,
    );
    return answer === choiceId;
  }

  private renderTextQuestion(question: TextComprehensionQuestion) {
    const handleTextChange = (e: InputEvent) => {
      if (!this.stage) return;
      const value = (e.target as HTMLTextAreaElement).value;
      this.participantAnswerService.updateComprehensionAnswer(
        this.stage.id,
        question.id,
        value,
      );
    };

    const answer = this.stage
      ? this.participantAnswerService.getComprehensionAnswer(
          this.stage.id,
          question.id,
        )
      : '';

    return html`
      <div class="question">
        <div class="question-title">
          ${unsafeHTML(convertMarkdownToHTML(question.questionTitle + '*'))}
        </div>
        <md-outlined-text-field
          type="textarea"
          placeholder="Type your answer"
          .value=${answer || ''}
          ?disabled=${this.participantService.disableStage}
          @input=${handleTextChange}
        >
        </md-outlined-text-field>
      </div>
    `;
  }

  private renderRadioButton(choice: MultipleChoiceItem, questionId: string) {
    const id = `${questionId}-${choice.id}`;

    const handleMultipleChoiceClick = () => {
      if (!this.stage) return;
      this.participantAnswerService.updateComprehensionAnswer(
        this.stage.id,
        questionId,
        choice.id,
      );
    };

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

  private hasAnswer(question: ComprehensionQuestion) {
    if (!this.stage) return false;

    const answer = this.participantAnswerService.getComprehensionAnswer(
      this.stage.id,
      question.id,
    );
    return answer;
  }

  private isCheckComplete(question: ComprehensionQuestion) {
    if (!this.stage) return false;

    const answer = this.participantAnswerService.getComprehensionAnswer(
      this.stage.id,
      question.id,
    );

    if (question.kind === ComprehensionQuestionKind.TEXT) {
      const textQuestion = question as TextComprehensionQuestion;
      return answer === textQuestion.correctAnswer;
    } else if (question.kind === ComprehensionQuestionKind.MULTIPLE_CHOICE) {
      const mcQuestion = question as MultipleChoiceComprehensionQuestion;
      return answer === mcQuestion.correctAnswerId;
    }
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'comprehension-participant-view': ComprehensionView;
  }
}
