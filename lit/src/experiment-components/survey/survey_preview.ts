import "../../pair-components/textarea";

import "../footer/footer";
import "../progress/progress_stage_completed";

import '@material/web/radio/radio.js';

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import {
  ITEMS,
  ItemName,
  QuestionConfig,
  MultipleChoiceItem,
  MultipleChoiceQuestionConfig,
  MultipleChoiceQuestionAnswer,
  ScaleQuestionAnswer,
  ScaleQuestionConfig,
  SurveyQuestionKind,
  SurveyStageAnswer,
  SurveyStageConfig,
  TextQuestionAnswer,
  TextQuestionConfig
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

    const questionsComplete = () => {
      const answerMap = this.answer?.answers;
      const answerList = answerMap ? Object.values(answerMap) : [];

      if (answerList.length !== this.stage?.questions.length) {
        return false;
      }
      for (const answer of answerList.filter(answer => answer.kind === SurveyQuestionKind.Text)) {
        const textAnswer = (answer as TextQuestionAnswer);
        if (textAnswer.answerText === '') {
          return false;
        }
      }
      return true;
    }

    const descriptionContent = this.stage.description ? html`<div class="description">${this.stage.description}</div>` : nothing;

    return html`
      ${descriptionContent}
      
      <div class="questions-wrapper">
        ${this.stage.questions.map(question =>
        this.renderQuestion(question))}
      </div>
      <stage-footer .disabled=${!questionsComplete()}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderQuestion(question: QuestionConfig) {
    switch (question.kind) {
      case SurveyQuestionKind.MultipleChoice:
        return this.renderMultipleChoiceQuestion(question);
      case SurveyQuestionKind.Scale:
        return this.renderScaleQuestion(question);
      case SurveyQuestionKind.Text:
        return this.renderTextQuestion(question);
      default:
        return nothing;
    }
  }

  private renderTextQuestion(question: TextQuestionConfig) {
    const handleTextChange = (e: Event) => {
      const answerText = (e.target as HTMLInputElement).value ?? '';
      const answer: TextQuestionAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.Text,
        answerText
      }
      this.participantService.updateSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    const answer = (this.answer?.answers[question.id]) as TextQuestionAnswer;
    return html`
      <div class="question">
        <div class="question-title">${question.questionText}</div>
        <pr-textarea
          variant="outlined"
          placeholder="Type your response"
          .value=${answer?.answerText ?? ''}
          ?disabled=${!this.participantService.isCurrentStage()}
          @change=${handleTextChange}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderMultipleChoiceQuestion(question: MultipleChoiceQuestionConfig) {
    return html`
      <div class="radio-question">
        <div class="title">${question.questionText}</div>
        ${question.options.map(option => this.renderRadioButton(option, question.id))}
      </div>
    `;
  }

  private isMultipleChoiceMatch(questionId: number, choiceId: number) {
    const questionAnswer = this.answer?.answers[questionId];

    if (questionAnswer && questionAnswer.kind === SurveyQuestionKind.MultipleChoice) {
      return questionAnswer.choice === choiceId;
    }
    return false;
  }

  private renderRadioButton(choice: MultipleChoiceItem, questionId: number) {
    const id = `${questionId}-${choice.id}`;

    const handleMultipleChoiceClick = (e: Event) => {
      const choice = Number((e.target as HTMLInputElement).value);
      const answer: MultipleChoiceQuestionAnswer = {
        id: questionId,
        kind: SurveyQuestionKind.MultipleChoice,
        choice
      }
      this.participantService.updateSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    return html`
      <div class="radio-button">
        <md-radio
          id=${id}
          name=${questionId}
          value=${choice.id}
          aria-label=${choice.text}
          ?checked=${this.isMultipleChoiceMatch(questionId, choice.id)}
          ?disabled=${!this.participantService.isCurrentStage()}
          @change=${handleMultipleChoiceClick}
        >
        </md-radio>
        <label for=${id}>${choice.text}</label>
      </div>
    `;
  }

  private renderScaleQuestion(question: ScaleQuestionConfig) {
    const scale = [...Array(10).keys()].map(n => n + 1);

    return html`
      <div class="question">
        <div class="question-title">${question.questionText}</div>
        <div class="scale labels">
          <div>${question.lowerBound}</div>
          <div>${question.upperBound}</div>
        </div>
        <div class="scale values">
          ${scale.map(num => this.renderScaleRadioButton(question, num))}
        </div>
      </div>
    `;
  }

  private renderScaleRadioButton(question: ScaleQuestionConfig, value: number) {
    const name = `${question.id}`;
    const id = `${question.id}-${value}`;

    const isScaleChoiceMatch = (score: number) => {
      const questionAnswer = this.answer?.answers[question.id];

      if (questionAnswer && questionAnswer.kind === SurveyQuestionKind.Scale) {
        return questionAnswer.score === score;
      }
      return false;
    };

    const handleScaleClick = (e: Event) => {
      const score = Number((e.target as HTMLInputElement).value);
      const answer: ScaleQuestionAnswer = {
        id: question.id,
        kind: SurveyQuestionKind.Scale,
        score
      };

      this.participantService.updateSurveyStage(
        this.participantService.profile!.currentStageId,
        [answer]
      );
    };

    return html`
      <div class="scale-button">
        <md-radio
          id=${id}
          name=${name}
          value=${value}
          aria-label=${value}
          ?checked=${isScaleChoiceMatch(value)}
          ?disabled=${!this.participantService.isCurrentStage()}
          @change=${handleScaleClick}
        >
        </md-radio>
        <label for=${id}>${value}</label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "survey-preview": SurveyPreview;
  }
}
