import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '../stages/survey_editor_menu';
import '@material/web/checkbox/checkbox.js';
import '../../pair-components/textarea_template';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';
import {renderConditionEditor} from '../../shared/condition_editor.utils';
import {
  CheckSurveyQuestion,
  Condition,
  getConditionTargetsFromStages,
  MultipleChoiceItem,
  MultipleChoiceSurveyQuestion,
  sanitizeSurveyQuestionConditions,
  ScaleSurveyQuestion,
  SurveyPerParticipantStageConfig,
  SurveyStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  TextSurveyQuestion,
  createMultipleChoiceItem,
} from '@deliberation-lab/utils';

import {styles} from './survey_editor.scss';

/** Survey editor for survey questions. */
@customElement('survey-editor')
export class SurveyEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage:
    | SurveyStageConfig
    | SurveyPerParticipantStageConfig
    | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="section">
        <div class="header">
          <div class="title">Survey questions</div>
          <survey-editor-menu .stage=${this.stage}></survey-editor-menu>
        </div>
        ${this.stage.questions.map((question, index) =>
          this.renderQuestion(question, index),
        )}
      </div>
    `;
  }

  private renderQuestion(question: SurveyQuestion, index: number) {
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
  private renderQuestionType(question: SurveyQuestion) {
    switch (question.kind) {
      case SurveyQuestionKind.CHECK:
        return 'checkbox';
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        return 'multiple choice';
      case SurveyQuestionKind.SCALE:
        return 'scale from 1 to 10';
      case SurveyQuestionKind.TEXT:
        return 'freeform text';
      default:
        return nothing;
    }
  }

  private renderQuestionContent(question: SurveyQuestion, index: number) {
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

  /**
   * Update the stage with new questions, automatically sanitizing conditions.
   */
  private updateStageQuestions(questions: SurveyQuestion[]) {
    if (!this.stage) return;

    const sanitizedQuestions = sanitizeSurveyQuestionConditions(
      questions,
      this.stage.id,
    );

    this.experimentEditor.updateStage({
      ...this.stage,
      questions: sanitizedQuestions,
    });
  }

  moveQuestionUp(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index - 1),
      this.stage.questions[index],
      this.stage.questions[index - 1],
      ...this.stage.questions.slice(index + 1),
    ];

    this.updateStageQuestions(questions);
  }

  moveQuestionDown(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      this.stage.questions[index + 1],
      this.stage.questions[index],
      ...this.stage.questions.slice(index + 2),
    ];

    this.updateStageQuestions(questions);
  }

  deleteQuestion(index: number) {
    if (!this.stage) return;

    const questions = [
      ...this.stage.questions.slice(0, index),
      ...this.stage.questions.slice(index + 1),
    ];

    this.updateStageQuestions(questions);
  }

  updateQuestion(question: SurveyQuestion, index: number) {
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

  private renderQuestionTitleEditor(question: SurveyQuestion, index: number) {
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
      <pr-textarea-template
        placeholder="Add question title"
        size="medium"
        .value=${question.questionTitle ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateTitle}
      >
      </pr-textarea-template>
    `;
  }

  private renderQuestionConditionEditor(
    question: SurveyQuestion,
    index: number,
  ) {
    if (!this.stage) return nothing;

    const onConditionChange = (condition: Condition | undefined) => {
      this.updateQuestion(
        {
          ...question,
          condition,
        },
        index,
      );
    };

    // Get condition targets from all preceding stages and questions before this one
    const targets = getConditionTargetsFromStages(
      this.experimentEditor.stages,
      this.stage.id,
      {includeCurrentStage: true, currentStageQuestionIndex: index},
    );

    return renderConditionEditor({
      condition: question.condition,
      targets,
      canEdit: this.experimentEditor.canEditStages,
      onConditionChange,
    });
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

  private renderCheckQuestion(question: CheckSurveyQuestion, index: number) {
    const toggleIsRequired = () => {
      const updatedQuestion = {...question, isRequired: !question.isRequired};
      this.updateQuestion(updatedQuestion, index);
    };

    return html`
      <div class="header">
        <div class="left">
          ${this.renderQuestionTitleEditor(question, index)}
        </div>
        <div class="right">${this.renderQuestionNav(question, index)}</div>
      </div>
      <label class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${question.isRequired}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${toggleIsRequired}
        >
        </md-checkbox>
        <span class="checkbox-label"
          >Make this question required for participants</span
        >
      </label>
      ${this.renderQuestionConditionEditor(question, index)}
    `;
  }

  private renderMultipleChoiceQuestion(
    question: MultipleChoiceSurveyQuestion,
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
          question.correctAnswerId === item.id ? null : item.id;
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
            <pr-textarea-template
              placeholder="Add text for multiple choice item"
              .value=${item.text}
              ?disabled=${!this.experimentEditor.canEditStages}
              @input=${updateItem}
            >
            </pr-textarea-template>
            <pr-icon-button
              icon="close"
              color="neutral"
              padding="small"
              variant="default"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${deleteItem}>
            </pr-icon-button>
          </div>
        </div>
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
        <b>Optional:</b> Check a multiple choice item to set it as a "correct"
        answer (e.g., to calculate results or payout later)
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
      ${this.renderQuestionConditionEditor(question, index)}
    `;
  }

  private addMultipleChoiceItem(
    question: MultipleChoiceSurveyQuestion,
    index: number,
  ) {
    const options = [...question.options, createMultipleChoiceItem()];
    this.updateQuestion({...question, options}, index);
  }

  private updateMultipleChoiceItem(
    item: MultipleChoiceItem,
    itemIndex: number,
    question: MultipleChoiceSurveyQuestion,
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
    question: MultipleChoiceSurveyQuestion,
    questionIndex: number,
  ) {
    // If this was the correct answer, reset correct answer ID to null
    const itemId = question.options[itemIndex].id;
    const correctAnswerId =
      question.correctAnswerId === itemId ? null : question.correctAnswerId;

    // Remove item from list of options
    const options = [
      ...question.options.slice(0, itemIndex),
      ...question.options.slice(itemIndex + 1),
    ];

    this.updateQuestion({...question, options, correctAnswerId}, questionIndex);
  }

  private renderScaleQuestion(question: ScaleSurveyQuestion, index: number) {
    const updateLowerText = (e: InputEvent) => {
      const lowerText = (e.target as HTMLTextAreaElement).value;
      this.updateQuestion({...question, lowerText}, index);
    };

    const updateUpperText = (e: InputEvent) => {
      const upperText = (e.target as HTMLTextAreaElement).value;
      this.updateQuestion({...question, upperText}, index);
    };

    const updateMiddleText = (e: InputEvent) => {
      const middleText = (e.target as HTMLTextAreaElement).value;
      this.updateQuestion({...question, middleText}, index);
    };

    const updateLowerValue = (e: InputEvent) => {
      const lowerValue =
        parseInt((e.target as HTMLInputElement).value, 10) || 0;
      this.updateQuestion({...question, lowerValue}, index);
    };

    const updateUpperValue = (e: InputEvent) => {
      const upperValue =
        parseInt((e.target as HTMLInputElement).value, 10) || 10;
      this.updateQuestion({...question, upperValue}, index);
    };

    const updateStepSize = (e: InputEvent) => {
      const stepSize = parseInt((e.target as HTMLInputElement).value, 10) || 1;
      this.updateQuestion({...question, stepSize}, index);
    };

    const toggleUseSlider = () => {
      const updatedQuestion = {...question, useSlider: !question.useSlider};
      this.updateQuestion(updatedQuestion, index);
    };

    return html`
      <div class="header">
        <div class="left">
          ${this.renderQuestionTitleEditor(question, index)}
        </div>
        ${this.renderQuestionNav(question, index)}
      </div>
      <div class="description">
        <b>Scale range:</b> Set the numeric range for the scale.
      </div>
      <div class="scale-value-editors">
        <div class="scale-value-editor">
          <label>Lower value</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            required
            .value=${question.lowerValue.toString()}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateLowerValue}
          />
        </div>
        <div class="scale-value-editor">
          <label>Upper value</label>
          <input
            type="number"
            min=${(question.lowerValue + 1).toString()}
            max="100"
            step="1"
            required
            .value=${question.upperValue.toString()}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateUpperValue}
          />
        </div>
        <div class="scale-value-editor">
          <label>Step size</label>
          <input
            type="number"
            min="1"
            max="10"
            step="1"
            required
            .value=${(question.stepSize ?? 1).toString()}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateStepSize}
          />
        </div>
      </div>
      <div class="description">
        <b>Scale labels:</b> Add text labels for the lower and upper ends of the
        scale.
      </div>
      <div class="scale-text-editors">
        <pr-textarea-template
          label="Lower text (${question.lowerValue})"
          variant="outlined"
          placeholder="e.g., Strongly disagree"
          size="small"
          .value=${question.lowerText ?? ''}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateLowerText}
        >
        </pr-textarea-template>
        <pr-textarea-template
          label="Upper text (${question.upperValue})"
          variant="outlined"
          placeholder="e.g., Strongly agree"
          size="small"
          .value=${question.upperText ?? ''}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateUpperText}
        >
        </pr-textarea-template>
        <pr-textarea-template
          label="Middle text (optional)"
          variant="outlined"
          placeholder="e.g., Neutral"
          size="small"
          .value=${question.middleText ?? ''}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateMiddleText}
        >
        </pr-textarea-template>
      </div>
      <label class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${question.useSlider}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${toggleUseSlider}
        >
        </md-checkbox>
        <span class="checkbox-label">
          Optional: Display the scale as a slider instead of radio buttons
        </span>
      </label>
      ${this.renderQuestionConditionEditor(question, index)}
    `;
  }

  private renderTextQuestion(question: TextSurveyQuestion, index: number) {
    const updateMinCharCount = (e: InputEvent) => {
      const value = (e.target as HTMLInputElement).value;
      const minCharCount = value ? parseInt(value, 10) : undefined;
      this.updateQuestion({...question, minCharCount}, index);
    };

    const updateMaxCharCount = (e: InputEvent) => {
      const value = (e.target as HTMLInputElement).value;
      const maxCharCount = value ? parseInt(value, 10) : undefined;
      this.updateQuestion({...question, maxCharCount}, index);
    };

    return html`
      <div class="header">
        <div class="left">
          ${this.renderQuestionTitleEditor(question, index)}
        </div>
        ${this.renderQuestionNav(question, index)}
      </div>
      <div class="description">
        <b>Character limits:</b> Set minimum and maximum character counts for
        the response.
      </div>
      <div class="char-count-controls">
        <div class="char-count-editor">
          <label>Minimum characters (optional)</label>
          <input
            type="number"
            min="0"
            placeholder="No minimum"
            .value=${question.minCharCount?.toString() ?? ''}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateMinCharCount}
          />
        </div>
        <div class="char-count-editor">
          <label>Maximum characters (optional)</label>
          <input
            type="number"
            min="1"
            placeholder="No maximum"
            .value=${question.maxCharCount?.toString() ?? ''}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateMaxCharCount}
          />
        </div>
      </div>
      ${this.renderQuestionConditionEditor(question, index)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-editor': SurveyEditor;
  }
}
