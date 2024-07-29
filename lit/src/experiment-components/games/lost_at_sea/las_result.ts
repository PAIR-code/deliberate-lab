import "../../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import {
  getLostAtSeaPairAnswer,
  ITEMS,
  ItemName,
  LostAtSeaQuestion,
  LostAtSeaQuestionAnswer,
  LostAtSeaSurveyStageAnswer,
  LostAtSeaSurveyStageConfig,
  SurveyQuestionKind,
} from "@llm-mediation-experiments/utils";

import { styles } from "./las_result.scss";

/** Lost at Sea survey results */
@customElement("las-survey-results")
export class SurveyResult extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: LostAtSeaSurveyStageConfig|null = null;
  @property() answer: LostAtSeaSurveyStageAnswer|null = null;
  @property() leaderAnswer: Record<string, LostAtSeaQuestionAnswer>|null = null;

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
            ${this.leaderAnswer ? html`<div class="table-cell">Your elected leader chose</div>` : nothing}
          </div>
        </div>
        ${this.stage.questions.map(question => this.renderQuestion(question))}
      </div>
    `;
  }

  private renderIcon(correctAnswer: ItemName, selectedAnswer: ItemName) {
    if (correctAnswer === selectedAnswer) {
      return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
    } else {
      return html`<pr-icon color="error" icon="cancel"></pr-icon>`;
    }
  }

  private renderQuestion(question: LostAtSeaQuestion) {
    const participantAnswer =
      this.answer?.answers[question.id] as LostAtSeaQuestionAnswer;

    const gameAnswer = getLostAtSeaPairAnswer(question.item1, question.item2);

    return html`
      <div class="table-row">
        <div class="table-cell">
          ${ITEMS[question.item1].name}
        </div>
        <div class="table-cell">
          ${ITEMS[question.item2].name}
        </div>
        <div class="table-cell">
          ${this.renderIcon(gameAnswer, participantAnswer.choice)}
          <div>${ITEMS[participantAnswer.choice].name}</div>
        </div>
        ${this.renderLeaderAnswer(gameAnswer, question)}
      </div>
    `;
  }

  private renderLeaderAnswer(gameAnswer: ItemName, question: LostAtSeaQuestion) {
    if (!this.leaderAnswer) return nothing;

    const leaderAnswer = this.leaderAnswer[question.id] as LostAtSeaQuestionAnswer;

    return html`
      <div class="table-cell">
        ${this.renderIcon(gameAnswer, leaderAnswer.choice)}
        <div>${ITEMS[leaderAnswer.choice].name}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "las-survey-results": SurveyResult;
  }
}
