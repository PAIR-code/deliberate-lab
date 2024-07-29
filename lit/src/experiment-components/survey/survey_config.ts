import "../../pair-components/textarea";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import {
  SurveyConfigService
} from "../../services/config/survey_config_service";

import {
  QuestionConfig,
  MultipleChoiceQuestionConfig,
  ScaleQuestionConfig,
  SurveyQuestionKind
} from "@llm-mediation-experiments/utils";

import { styles } from "./survey_config.scss";

/** Survey config */
@customElement("survey-config")
export class SurveyConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly surveyConfig = core.getService(SurveyConfigService);

  override render() {
    const handleNameInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.surveyConfig.updateName(value);
    };

    const handleDescriptionInput = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.surveyConfig.updateDescription(value);
    };
    
    const handlePopupText = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.surveyConfig.updatePopupText(value);
    };

    const addQuestion = () => {
      this.surveyConfig.addScaleQuestion();
    }

    return html`
      <pr-textarea
        label="Stage name"
        placeholder="Stage name"
        variant="outlined"
        .value=${this.surveyConfig.name}
        @input=${handleNameInput}
      >
      </pr-textarea>
      
      <pr-textarea
        label="Stage description"
        placeholder="Stage description"
        variant="outlined"
        .value=${this.surveyConfig.description}
        @input=${handleDescriptionInput}
      >
      </pr-textarea>
 
      <pr-textarea
        label="Info icon pop-up text"
        placeholder="Info icon pop-up text (markdown supported)"
        variant="outlined"
        .value=${this.surveyConfig.popupText}
        @input=${handlePopupText}
      >
      </pr-textarea>

      <pr-button @click=${addQuestion}>Add scale question</pr-button>
      ${this.surveyConfig.questions.map(
        (question, index) => this.renderQuestion(question, index))}
    `;
  }

  private renderQuestion(question: QuestionConfig, index: number) {
    switch (question.kind) {
      case SurveyQuestionKind.MultipleChoice:
        return this.renderMultipleChoiceQuestion(question, index);
      case SurveyQuestionKind.Scale:
        return this.renderScaleQuestion(question, index);
      default:
        return nothing;
    }
  }

  private renderMultipleChoiceQuestion(
    question: MultipleChoiceQuestionConfig, index: number
  ) {
    return html`<code>${JSON.stringify(question)}</code>`;
  }

  private renderScaleQuestion(question: ScaleQuestionConfig, index: number) {
    const updateQuestionTitle = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.surveyConfig.updateScaleQuestion(
        index, { ...question, questionText: value }
      );
    };


    const updateQuestionLower = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.surveyConfig.updateScaleQuestion(
        index, { ...question, lowerBound: value }
      );
    };

    const updateQuestionUpper = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.surveyConfig.updateScaleQuestion(
        index, { ...question, upperBound: value }
      );
    };

    return html`
      <div class="question">
        <h3>Question ${index + 1} of ${this.surveyConfig.questions.length}</h3>
        <pr-textarea
          label="Question text"
          placeholder="Question text"
          variant="outlined"
          .value=${question.questionText}
          @input=${updateQuestionTitle}
        >
        </pr-textarea>
        <pr-textarea
          label="Lower bound description"
          placeholder="Lower bound description"
          variant="outlined"
          .value=${question.lowerBound}
          @input=${updateQuestionLower}
        >
        </pr-textarea>
        <pr-textarea
          label="Upper bound description"
          placeholder="Upper bound description"
          variant="outlined"
          .value=${question.upperBound}
          @input=${updateQuestionUpper}
        >
        </pr-textarea>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "survey-config": SurveyConfig;
  }
}
