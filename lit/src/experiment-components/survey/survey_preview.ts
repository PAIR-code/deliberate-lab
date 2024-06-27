import "../../pair-components/textarea";

import "../footer/footer";
import "../progress/progress_stage_completed";

import '@material/web/radio/radio.js';
import '@material/web/slider/slider.js';

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import {
  ITEMS,
  ItemName,
  QuestionConfig,
  RatingQuestionAnswer,
  RatingQuestionConfig,
  ScaleQuestionAnswer,
  SurveyQuestionKind,
  SurveyStageAnswer,
  SurveyStageConfig
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

    const ratingsComplete = () => {
      const answerMap = this.answer?.answers;
      const answerList = answerMap ? Object.values(answerMap) : [];

      return (answerList.filter(
        answer => answer.kind === SurveyQuestionKind.Rating).length) ===
        (this.stage?.questions.filter(
        question => question.kind === SurveyQuestionKind.Rating).length)
    };

    const descriptionContent = this.stage.description ? html`<div class="description">${this.stage.description}</div>` : nothing;

    return html`
      ${descriptionContent}
      
      <div class="questions-wrapper">
        ${this.stage.questions.map(question =>
        this.renderRatingQuestion(question))}
        ${this.stage.questions.map(question =>
        this.renderScaleQuestion(question))}
      </div>
      <stage-footer .disabled=${!ratingsComplete()}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderRatingQuestion(question: QuestionConfig) {
    if (question.kind !== SurveyQuestionKind.Rating) {
      return nothing;
    }

    const onSelect = (choice: ItemName) => {
      // If disabled
      if (!this.participantService.isCurrentStage()) {
        return;
      }

      const answer: RatingQuestionAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.Rating,
        choice,
        confidence: this.getRatingQuestionConfidence(question),
      };

      this.participantService.updateSurveyStage(
        this.participantService.profile!.workingOnStageName,
        [answer]
      );
    };

    const isMatch = (item: string) => {
      const questionAnswer = this.answer?.answers[question.id];

      if (questionAnswer && questionAnswer.kind === SurveyQuestionKind.Rating) {
        return questionAnswer.choice === item;
      }

      return false;
    }

    const getClassMap = (item: string) => {
      return classMap({
        "ranking-question": true,
        "selected": isMatch(item),
        "disabled": !this.participantService.isCurrentStage()
      });
    }

    return html`
      <div class="question">
        <div class="question-title">${question.questionText}</div>
        <div class="ranking-question-wrapper">
          <div class=${getClassMap(question.item1)}
            @click=${() => { onSelect(question.item1); }}
          >
            <div class="img-wrapper">
              <img src=${ITEMS[question.item1].imageUrl} />
            </div>
            <div class="radio-button">
              <md-radio
                id="${question.id}-1"
                name=${question.id}
                value="1"
                aria-label=${ITEMS[question.item1].name}
                ?checked=${isMatch(question.item1)}
                ?disabled=${!this.participantService.isCurrentStage()}>
              </md-radio>
              <label for="1">${ITEMS[question.item1].name}</label>
            </div>
          </div>
          <div class=${getClassMap(question.item2)}
              @click=${() => { onSelect(question.item2); }}
            >
            <div class="img-wrapper">
              <img src=${ITEMS[question.item2].imageUrl} />
            </div>
            <div class="radio-button">
              <md-radio
                id="${question.id}-2"
                name=${question.id}
                value="2"
                aria-label=${ITEMS[question.item2].name}
                ?checked=${isMatch(question.item2)}
                ?disabled=${!this.participantService.isCurrentStage()}>
              </md-radio>
              <label for="2">${ITEMS[question.item2].name}</label>
            </div>
          </div>
        </div>
        ${this.renderRatingConfidence(question)}
      </div>
    `;
  }

  private getRatingQuestionChoice(question: RatingQuestionConfig) {
    const questionAnswer = this.answer?.answers[question.id];

    if (questionAnswer && questionAnswer.kind === SurveyQuestionKind.Rating) {
      return questionAnswer.choice;
    }

    return null;
  }

  private getRatingQuestionConfidence(question: RatingQuestionConfig) {
    const questionAnswer = this.answer?.answers[question.id];

    if (questionAnswer && questionAnswer.kind === SurveyQuestionKind.Rating) {
      return questionAnswer.confidence;
    }

    return .5;
  }

  private renderRatingConfidence(question: RatingQuestionConfig) {
    const onChange = (e: Event) => {
      const confidence = parseFloat((e.target as HTMLInputElement).value);
      const choice = this.getRatingQuestionChoice(question);

      if (!choice) {
        return;
      }

      const answer: RatingQuestionAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.Rating,
        choice,
        confidence,
      };

      this.participantService.updateSurveyStage(
        this.participantService.profile!.workingOnStageName,
        [answer]
      );
    };

    const disableSlider = !this.participantService.isCurrentStage()
      || this.getRatingQuestionChoice(question) === null;

    return html`
      <div class="slider-wrapper">
        <div>Not confident</div>
        <md-slider
          step=".1"
          ticks
          min="0"
          max="1"
          value=${this.getRatingQuestionConfidence(question)}
          labeled
          ?disabled=${disableSlider}
          @change=${onChange}
        >
        </md-slider>
        <div>Very confident</div>
      </div>
    `;
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
        this.participantService.profile!.workingOnStageName,
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
