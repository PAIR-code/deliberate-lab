import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ComprehensionStageConfig,
  ComprehensionQuestion,
  ComprehensionQuestionKind,
  MultipleChoiceComprehensionQuestion,
  TextComprehensionQuestion,
  MultipleChoiceItem,
  createMultipleChoiceItem,
  createMultipleChoiceComprehensionQuestion,
  createTextComprehensionQuestion,
} from '@deliberation-lab/utils';

import {styles} from './comprehension_editor.scss';

/** Editor for comprehension stage. */
@customElement('comprehension-editor')
export class ComprehensionEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: ComprehensionStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="section">
        <div class="header">
          <div class="title">Comprehension questions</div>
          <pr-menu
            name="Add question"
            ?disabled=${!this.experimentEditor.canEditStages}
          >
            <div class="menu-wrapper">
              <div
                class="menu-item"
                role="button"
                @click=${this.addTextQuestion}
              >
                Text answer
              </div>
              <div
                class="menu-item"
                role="button"
                @click=${this.addMultipleChoiceQuestion}
              >
                Multiple choice
              </div>
            </div>
          </pr-menu>
        </div>
        ${this.stage.questions.map((question, index) =>
          this.renderQuestion(question, index),
        )}
      </div>
    `;
  }

  private renderQuestion(question: ComprehensionQuestion, index: number) {
    return html`
      <div class="question-wrapper">
        <div
          class="question-label ${question.questionTitle === ''
            ? 'required'
            : ''}"
        >
          Question ${index + 1} (${this.renderQuestionType(question)})*
        </div>
        <div class="question">
          ${this.renderQuestionContent(question, index)}
        </div>
      </div>
    `;
  }

  private renderQuestionType(question: ComprehensionQuestion) {
    switch (question.kind) {
      case ComprehensionQuestionKind.MULTIPLE_CHOICE:
        return 'multiple choice';
      case ComprehensionQuestionKind.TEXT:
        return 'text answer';
      default:
        return nothing;
    }
  }

  private renderQuestionContent(
    question: ComprehensionQuestion,
    index: number,
  ) {
    switch (question.kind) {
      case ComprehensionQuestionKind.MULTIPLE_CHOICE:
        return this.renderMultipleChoiceQuestion(
          question as MultipleChoiceComprehensionQuestion,
          index,
        );
      case ComprehensionQuestionKind.TEXT:
        return this.renderTextQuestion(
          question as TextComprehensionQuestion,
          index,
        );
      default:
        return nothing;
    }
  }

  private renderQuestionTitleEditor(
    question: ComprehensionQuestion,
    index: number,
  ) {
    const updateTitle = (e: InputEvent) => {
      const questionTitle = (e.target as HTMLTextAreaElement).value;
      this.updateQuestion(
        {
          ...question,
          questionTitle,
        },
        index,
      );
    };

    return html`
      <pr-textarea
        placeholder="Add question title"
        size="medium"
        .value=${question.questionTitle ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateTitle}
      >
      </pr-textarea>
    `;
  }

  private renderQuestionNav(question: ComprehensionQuestion, index: number) {
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
          ?disabled=${index === 0 || !this.experimentEditor.canEditStages}
          @click=${() => {
            this.moveQuestionUp(index);
          }}
        >
        </pr-icon-button>
        <pr-icon-button
          color="neutral"
          icon="arrow_downward"
          padding="small"
          size="small"
          variant="default"
          ?disabled=${index === this.stage.questions.length - 1 ||
          !this.experimentEditor.canEditStages}
          @click=${() => {
            this.moveQuestionDown(index);
          }}
        >
        </pr-icon-button>
        <pr-icon-button
          color="error"
          icon="delete"
          padding="small"
          size="small"
          variant="default"
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${() => {
            this.deleteQuestion(index);
          }}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private renderTextQuestion(
    question: TextComprehensionQuestion,
    index: number,
  ) {
    const updateCorrectAnswer = (e: InputEvent) => {
      const correctAnswer = (e.target as HTMLTextAreaElement).value;
      this.updateQuestion({...question, correctAnswer}, index);
    };

    return html`
      <div class="header">
        <div class="left">
          ${this.renderQuestionTitleEditor(question, index)}
        </div>
        ${this.renderQuestionNav(question, index)}
      </div>
      <div class="description">
        <b>Correct answer:</b> Enter the expected correct answer for this
        comprehension question.
      </div>
      <pr-textarea
        placeholder="Enter the correct answer"
        .value=${question.correctAnswer ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateCorrectAnswer}
      >
      </pr-textarea>
    `;
  }

  private renderMultipleChoiceQuestion(
    question: MultipleChoiceComprehensionQuestion,
    index: number,
  ) {
    const renderItem = (item: MultipleChoiceItem, itemIndex: number) => {
      const deleteItem = () => {
        this.deleteMultipleChoiceItem(itemIndex, question, index);
      };

      const updateItem = (e: InputEvent) => {
        const text = (e.target as HTMLTextAreaElement).value;
        const newItem = {...item, text};
        this.updateMultipleChoiceItem(newItem, itemIndex, question, index);
      };

      const updateCorrectAnswer = () => {
        const correctAnswerId =
          question.correctAnswerId === item.id ? '' : item.id;
        this.updateQuestion({...question, correctAnswerId}, index);
      };

      return html`
        <label class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${question.correctAnswerId === item.id}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCorrectAnswer}
          >
          </md-checkbox>
          <div class="mc-item">
            <pr-textarea
              placeholder="Add text for multiple choice item"
              .value=${item.text}
              ?disabled=${!this.experimentEditor.canEditStages}
              @input=${updateItem}
            >
            </pr-textarea>
            <pr-icon-button
              icon="close"
              color="neutral"
              padding="small"
              variant="default"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${deleteItem}
            >
            </pr-icon-button>
          </div>
        </label>
      `;
    };

    return html`
      <div class="header">
        <div class="left">
          ${this.renderQuestionTitleEditor(question, index)}
        </div>
        ${this.renderQuestionNav(question, index)}
      </div>
      <div class="description">
        <b>Required:</b> Check the correct answer for this comprehension
        question
      </div>
      ${question.options.map((option, index) => renderItem(option, index))}
      <pr-button
        color="secondary"
        variant="tonal"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.addMultipleChoiceItem(question, index);
        }}
      >
        Add multiple choice item
      </pr-button>
    `;
  }

  private addTextQuestion() {
    this.addQuestion(createTextComprehensionQuestion());
  }

  private addMultipleChoiceQuestion() {
    const options = [
      createMultipleChoiceItem({text: 'Option 1'}),
      createMultipleChoiceItem({text: 'Option 2'}),
    ];
    this.addQuestion(
      createMultipleChoiceComprehensionQuestion(
        {options},
        options[0].id, // Default to first option as correct
      ),
    );
  }

  private addQuestion(question: ComprehensionQuestion) {
    if (!this.stage) return;

    const questions = [...this.stage.questions, question];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  private moveQuestionUp(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index - 1),
      ...this.stage.questions.slice(index, index + 1),
      ...this.stage.questions.slice(index - 1, index),
      ...this.stage.questions.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  private moveQuestionDown(index: number) {
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

  private deleteQuestion(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      ...this.stage.questions.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  private updateQuestion(question: ComprehensionQuestion, index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      question,
      ...this.stage.questions.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      questions,
    });
  }

  private addMultipleChoiceItem(
    question: MultipleChoiceComprehensionQuestion,
    index: number,
  ) {
    const options = [...question.options, createMultipleChoiceItem()];
    this.updateQuestion({...question, options}, index);
  }

  private updateMultipleChoiceItem(
    item: MultipleChoiceItem,
    itemIndex: number,
    question: MultipleChoiceComprehensionQuestion,
    questionIndex: number,
  ) {
    const options = [
      ...question.options.slice(0, itemIndex),
      item,
      ...question.options.slice(itemIndex + 1),
    ];
    this.updateQuestion({...question, options}, questionIndex);
  }

  private deleteMultipleChoiceItem(
    itemIndex: number,
    question: MultipleChoiceComprehensionQuestion,
    questionIndex: number,
  ) {
    // Remove item from list of options
    const options = [
      ...question.options.slice(0, itemIndex),
      ...question.options.slice(itemIndex + 1),
    ];

    // If this was the correct answer, set the first remaining option as correct
    const itemId = question.options[itemIndex].id;
    let correctAnswerId = question.correctAnswerId;
    if (correctAnswerId === itemId) {
      correctAnswerId = options.length > 0 ? options[0].id : '';
    }

    this.updateQuestion({...question, options, correctAnswerId}, questionIndex);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'comprehension-editor': ComprehensionEditorComponent;
  }
}
