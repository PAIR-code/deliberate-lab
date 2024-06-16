import "../../pair-components/textarea";

import "../footer/footer";

import '@material/web/slider/slider.js';

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  ScaleQuestionAnswer,
  SurveyStageAnswer,
  SurveyStageConfig,
  SurveyQuestionKind,
  QuestionConfig
} from "@llm-mediation-experiments/utils";

import { core } from "../../core/core";
import { ParticipantService } from "../../services/participant_service";

import { styles } from "./survey_preview.scss";

/** Survey preview */
@customElement("survey-preview")
export class SurveyPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: SurveyStageConfig|null = null;
  @property() answer: SurveyStageAnswer|null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <div class="questions-wrapper">
        ${this.stage.questions.map(question =>
        this.renderRatingQuestion(question))}
        ${this.stage.questions.map(question =>
        this.renderScaleQuestion(question))}
      </div>
      <stage-footer></stage-footer>
    `;
  }

  private renderRatingQuestion(question: QuestionConfig) {
    if (question.kind !== SurveyQuestionKind.Rating) {
      return nothing;
    }

    return html`<div>${JSON.stringify(question)}</div>`;
  }

  private renderScaleQuestion(question: QuestionConfig) {
    if (question.kind !== SurveyQuestionKind.Scale) {
      return nothing;
    }

    const onChange = (e: Event) => {
      const score = Number((e.target as HTMLInputElement).value);
      const answer: ScaleQuestionAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.Scale,
        score
      };

      this.participantService.updateSurveyStage(
        this.participantService.profile?.workingOnStageName!,
        [answer]
      );
    };

    const getValue = () => {
      const questionAnswer = this.answer?.answers[question.id];

      if (questionAnswer && questionAnswer.kind === SurveyQuestionKind.Scale) {
        return questionAnswer.score;
      }

      return 5;
    }

    return html`
      <div class="question">
        <div class="question-title">${question.questionText}</div>
        <div class="slider-wrapper">
          <div>${question.lowerBound}</div>
          <md-slider
            step="1"
            ticks
            min="0"
            max="10"
            value=${getValue()}
            labeled
            ?disabled=${!this.participantService.isCurrentStage()}
            @change=${onChange}
          >
          </md-slider>
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
