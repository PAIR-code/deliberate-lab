import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  CheckSurveyQuestion,
  MultipleChoiceItem,
  MultipleChoiceSurveyQuestion,
  ScaleSurveyQuestion,
  SurveyStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  StageKind,
  TextSurveyQuestion,
  createMultipleChoiceItem,
} from '@deliberation-lab/utils';

import {styles} from './survey_editor.scss';

/** Survey editor for survey questions. */
@customElement('survey-editor')
export class SurveyEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: SurveyStageConfig|undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.stage.questions.map(
        (question, index) => this.renderQuestion(question, index)
      )}
    `;
  }

  private renderQuestion(question: SurveyQuestion, index: number) {
    switch (question.kind) {
      case SurveyQuestionKind.CHECK:
        return this.renderCheckQuestion(question, index);
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        return this.renderMultipleChoiceQuestion(question, index);
      case SurveyQuestionKind.SCALE:
        return this.renderScaleQuestion(question, index);
      case SurveyQuestionKind.TEXT:
        return this.renderTextQuestion(question, index);
      default:
        return nothing;
    }
  }

  moveQuestionUp(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index - 1),
      ...this.stage.questions.slice(index, index + 1),
      ...this.stage.questions.slice(index - 1, index),
      ...this.stage.questions.slice(index + 1)
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  moveQuestionDown(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      ...this.stage.questions.slice(index + 1, index + 2),
      ...this.stage.questions.slice(index, index + 1),
      ...this.stage.questions.slice(index + 2),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  deleteQuestion(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      ...this.stage.questions.slice(index + 1)
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  updateQuestion(question: SurveyQuestion, index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      question,
      ...this.stage.questions.slice(index + 1)
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  private renderQuestionTitleEditor(question: SurveyQuestion, index: number) {
    const updateTitle = (e: InputEvent) => {
      const questionTitle = (e.target as HTMLTextAreaElement).value;
      this.updateQuestion(
        {
          ...question,
          questionTitle,
        }, index
      );
    };

    return html`
      <pr-textarea
        placeholder="Add question title"
        size="medium"
        .value=${question.questionTitle}
        @input=${updateTitle}
      >
      </pr-textarea>
    `;
  }

  private renderQuestionNav(question: SurveyQuestion, index: number) {
    if (!this.stage) {
      return;
    }

    return html`
      <div class="right">
        <pr-icon-button
          color="neutral"
          icon="arrow_upward"
          padding="small"
          size="small"
          variant="default"
          ?disabled=${index === 0}
          @click=${() => { this.moveQuestionUp(index) }}
        >
        </pr-icon-button>
        <pr-icon-button
          color="neutral"
          icon="arrow_downward"
          padding="small"
          size="small"
          variant="default"
          ?disabled=${index === this.stage.questions.length - 1}
          @click=${() => { this.moveQuestionDown(index) }}
        >
        </pr-icon-button>
        <pr-icon-button
          color="error"
          icon="delete"
          padding="small"
          size="small"
          variant="default"
          @click=${() => { this.deleteQuestion(index) }}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private renderCheckQuestion(question: CheckSurveyQuestion, index: number) {
    return html`
      <div class="question-wrapper">
        <div class="question-label">Question ${index + 1} (checkbox)</div>
        <div class="question">
          <div class="header">
            <div class="left">
              ${this.renderQuestionTitleEditor(question, index)}
            </div>
            ${this.renderQuestionNav(question, index)}
          </div>
        </div>
      </div>
    `;
  }

  private renderMultipleChoiceQuestion(question: MultipleChoiceSurveyQuestion, index: number) {
    const renderItem = (
      item: MultipleChoiceItem, itemIndex: number
    ) => {
      const deleteItem = () => {
        this.deleteMultipleChoiceItem(itemIndex, question, index);
      };

      const updateItem = (e: InputEvent) => {
        const text = (e.target as HTMLTextAreaElement).value;
        const newItem = {...item, text};
        this.updateMultipleChoiceItem(newItem, itemIndex, question, index);
      };

      const updateCorrectAnswer = () => {
        const correctAnswerId = question.correctAnswerId === item.id ? null : item.id;
        this.updateQuestion({...question, correctAnswerId}, index);
      }

      return html`
        <label class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${question.correctAnswerId === item.id}
            @click=${updateCorrectAnswer}
          >
          </md-checkbox>
          <div class="mc-item">
            <pr-textarea
              placeholder="Add text for multiple choice item"
              .value=${item.text}
              @input=${updateItem}
            >
            </pr-textarea>
            <pr-icon-button
              icon="close"
              color="neutral"
              padding="small"
              variant="default"
              @click=${deleteItem}>
            </pr-icon-button>
          </div>
        </div>
      `;
    };

    return html`
      <div class="question-wrapper">
        <div class="question-label">Question ${index + 1} (multiple choice)</div>
        <div class="question">
          <div class="header">
            <div class="left">
              ${this.renderQuestionTitleEditor(question, index)}
            </div>
            ${this.renderQuestionNav(question, index)}
          </div>
          <div class="description">
            <b>Optional:</b> Check a multiple choice item to set it as a "correct"
            answer (e.g., to calculate results or payout later)
          </div>
          ${question.options.map((option, index) => renderItem(option, index))}
          <pr-button
            color="secondary"
            variant="tonal"
            @click=${() => {this.addMultipleChoiceItem(question, index)}}
          >
            Add multiple choice item
          </pr-button>
        </div>
      </div>
    `;
  }

  private addMultipleChoiceItem(question: MultipleChoiceSurveyQuestion, index: number) {
    const options = [...question.options, createMultipleChoiceItem()];
    this.updateQuestion({ ...question, options }, index);
  }

  private updateMultipleChoiceItem(
    item: MultipleChoiceItem,
    itemIndex: number,
    question: MultipleChoiceSurveyQuestion,
    questionIndex: number
  ) {
    const options = [
      ...question.options.slice(0, itemIndex),
      item,
      ...question.options.slice(itemIndex + 1),
    ];
    this.updateQuestion({ ...question, options }, questionIndex);
  }

  private deleteMultipleChoiceItem(
    itemIndex: number,
    question: MultipleChoiceSurveyQuestion,
    questionIndex: number
  ) {
    // If this was the correct answer, reset correct answer ID to null
    const itemId = question.options[itemIndex].id;
    const correctAnswerId = question.correctAnswerId === itemId ? null
      : question.correctAnswerId;

    // Remove item from list of options
    const options = [
      ...question.options.slice(0, itemIndex),
      ...question.options.slice(itemIndex + 1),
    ];

    this.updateQuestion(
      { ...question, options, correctAnswerId }, questionIndex
    );
  }

  private renderScaleQuestion(question: ScaleSurveyQuestion, index: number) {
    return html`
      <div class="question-wrapper">
        <div class="question-label">Question ${index + 1} (scale of 1 to 10)</div>
        <div class="question">
          <div class="header">
            <div class="left">
              ${this.renderQuestionTitleEditor(question, index)}
            </div>
            ${this.renderQuestionNav(question, index)}
          </div>
        </div>
      </div>
    `;
  }

  private renderTextQuestion(question: TextSurveyQuestion, index: number) {
    return html`
      <div class="question-wrapper">
        <div class="question-label">Question ${index + 1} (freeform text)</div>
        <div class="question">
          <div class="header">
            <div class="left">
              ${this.renderQuestionTitleEditor(question, index)}
            </div>
            ${this.renderQuestionNav(question, index)}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-editor': SurveyEditor;
  }
}