import "../../../pair-components/textarea";

import "../../footer/footer";
import "../../progress/progress_stage_completed";

import '@material/web/radio/radio.js';
import '@material/web/slider/slider.js';

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import {
  ITEMS,
  ItemName,
  LostAtSeaQuestion,
  LostAtSeaQuestionAnswer,
  LostAtSeaSurveyStageAnswer,
  LostAtSeaSurveyStageConfig,
} from "@llm-mediation-experiments/utils";

import { core } from "../../../core/core";
import { ParticipantService } from "../../../services/participant_service";

import { styles } from "./las_survey_preview.scss";

/** Lost at Sea survey preview */
@customElement("las-survey-preview")
export class SurveyPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: LostAtSeaSurveyStageConfig|null = null;
  @property() answer: LostAtSeaSurveyStageAnswer|null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const ratingsComplete = () => {
      const answerMap = this.answer?.answers;
      const answerList = answerMap ? Object.values(answerMap) : [];

      return answerList.length === this.stage?.questions.length;
    };

    const descriptionContent = this.stage.description ? html`<div class="description">${this.stage.description}</div>` : nothing;

    return html`
      ${descriptionContent}
      
      <div class="questions-wrapper">
        ${this.stage.questions.map(question => this.renderQuestion(question))}
      </div>
      <stage-footer .disabled=${!ratingsComplete()}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderQuestion(question: LostAtSeaQuestion) {
    const onSelect = (choice: ItemName) => {
      // If disabled
      if (!this.participantService.isCurrentStage()) {
        return;
      }

      const answer: LostAtSeaQuestionAnswer = {
        id: question.id,
        choice,
        confidence: this.getQuestionConfidence(question),
      };

      this.participantService.updateLostAtSeaSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    const isMatch = (item: string) => {
      const questionAnswer = this.answer?.answers[question.id];

      if (questionAnswer) {
        return questionAnswer.choice === item;
      }

      return false;
    }

    const getClassMap = (item: string) => {
      return classMap({
        "question": true,
        "selected": isMatch(item),
        "disabled": !this.participantService.isCurrentStage()
      });
    }

    return html`
      <div class="survey-question">
        <div class="question-title">${question.questionText}</div>
        <div class="question-wrapper">
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
        ${this.renderConfidence(question)}
      </div>
    `;
  }

  private getQuestionChoice(question: LostAtSeaQuestion) {
    const questionAnswer = this.answer?.answers[question.id];

    if (questionAnswer) {
      return questionAnswer.choice;
    }

    return null;
  }

  private getQuestionConfidence(question: LostAtSeaQuestion) {
    const questionAnswer = this.answer?.answers[question.id];

    if (questionAnswer) {
      return questionAnswer.confidence;
    }

    return .5;
  }

  private renderConfidence(question: LostAtSeaQuestion) {
    const onChange = (e: Event) => {
      const confidence = parseFloat((e.target as HTMLInputElement).value);
      const choice = this.getQuestionChoice(question);

      if (!choice) {
        return;
      }

      const answer: LostAtSeaQuestionAnswer = {
        id: question.id,
        choice,
        confidence,
      };

      this.participantService.updateLostAtSeaSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    const disableSlider = !this.participantService.isCurrentStage()
      || this.getQuestionChoice(question) === null;

    return html`
      <div class="slider-wrapper">
        <div>Not confident</div>
        <md-slider
          step=".1"
          ticks
          min="0"
          max="1"
          value=${this.getQuestionConfidence(question)}
          labeled
          ?disabled=${disableSlider}
          @change=${onChange}
        >
        </md-slider>
        <div>Very confident</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "las-survey-preview": SurveyPreview;
  }
}
