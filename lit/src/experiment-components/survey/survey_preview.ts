import "../../pair-components/textarea";

import '@material/web/slider/slider.js';

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  SurveyStageConfig,
  SurveyQuestionKind,
  QuestionConfig
} from "@llm-mediation-experiments/utils";

import { styles } from "./survey_preview.scss";

/** Survey preview */
@customElement("survey-preview")
export class SurveyPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: SurveyStageConfig|null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      ${this.stage.questions.map(question =>
      this.renderScaleQuestion(question))}
    `;
  }

  private renderScaleQuestion(question: QuestionConfig) {
    if (question.kind !== SurveyQuestionKind.Scale) {
      return nothing;
    }
    return html`
      <div class="question">
        <div class="question-title">${question.questionText}</div>
        <div class="slider-wrapper">
          <div>${question.lowerBound}</div>
          <md-slider step="1" ticks min="0" max="10"></md-slider>
          <div>${question.upperBound}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "survey-preview": SurveyPreview;
  }
}
