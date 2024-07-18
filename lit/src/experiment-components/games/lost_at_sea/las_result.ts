import "../../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import {
  getLostAtSeaPairAnswer,
  ITEMS,
  ItemName,
  QuestionAnswer,
  QuestionConfig,
  RatingQuestionAnswer,
  SurveyStageAnswer,
  SurveyStageConfig,
  SurveyQuestionKind,
} from "@llm-mediation-experiments/utils";

import { styles } from "./las_result.scss";

/** Lost at Sea survey results */
@customElement("las-survey-results")
export class SurveyResult extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: SurveyStageConfig|null = null;
  @property() answer: SurveyStageAnswer|null = null;

  override render() {
    if (!this.answer || !this.stage) {
      return nothing;
    }

    return html`
      <h2>${this.stage.name}</h2>
      <div class="table">
        <div class="table-head">
          <div class="table-row">
            <div class="table-cell">
              Item 1
            </div>
            <div class="table-cell">
              Item 2
            </div>
            <div class="table-cell">
              You chose
            </div>
          </div>
        </div>
        ${this.stage.questions.map(question => this.renderRatingQuestion(question))}
      </div>
    `;
  }

  private renderRatingQuestion(question: QuestionConfig) {
    if (question.kind !== SurveyQuestionKind.Rating) {
      return nothing;
    }

    const participantAnswer =
      this.answer?.answers[question.id] as RatingQuestionAnswer;

    const gameAnswer = getLostAtSeaPairAnswer(question.item1, question.item2);

    const renderIcon = () => {
      if (gameAnswer === participantAnswer.choice) {
        return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
      } else {
        return html`<pr-icon color="error" icon="cancel"></pr-icon>`;
      }
    };

    return html`
      <div class="table-row">
        <div class="table-cell">
          ${ITEMS[question.item1].name}
        </div>
        <div class="table-cell">
          ${ITEMS[question.item2].name}
        </div>
        <div class="table-cell">
          ${renderIcon()}
          <div>${ITEMS[participantAnswer.choice].name}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "las-survey-results": SurveyResult;
  }
}
