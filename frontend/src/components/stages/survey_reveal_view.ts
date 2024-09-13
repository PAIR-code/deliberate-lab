import "../../pair-components/icon";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import {
  MultipleChoiceSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  SurveyAnswer,
  SurveyQuestion,
  SurveyQuestionKind,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
} from "@deliberation-lab/utils";

import { styles } from "./survey_reveal_view.scss";

/** Survey reveal view */
@customElement("survey-reveal-view")
export class SurveyReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: SurveyStageConfig|undefined = undefined;
  @property() answer: SurveyStageParticipantAnswer|undefined = undefined;
  @property() publicData: SurveyStagePublicData|undefined = undefined;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const questions: MultipleChoiceSurveyQuestion[] = [];
    for (const question of this.stage.questions) {
      if (question.kind === SurveyQuestionKind.MULTIPLE_CHOICE) {
        questions.push((question as MultipleChoiceSurveyQuestion));
      }
    }

    const getMaxOptions = () => {
      let count = 0;
      for (const question of questions) {
        const optionCount = question.options.length;
        if (optionCount > count) {
          count = optionCount;
        }
      }
      return count;
    };
    const maxOptions = getMaxOptions();

    return html`
      <h2>${this.stage.name}</h2>
      <div class="table">
        <div class="table-head">
          <div class="table-row">
            ${[...Array(maxOptions).keys()].map(num =>
              html`<div class="table-cell">Option ${num + 1}</div>`
            )}
            <div class="table-cell">
              You chose
            </div>
            ${this.renderLeaderCell()}
          </div>
        </div>
        ${questions.map(
          question => this.renderQuestion(question, maxOptions)
        )}
      </div>
    `;
  }

  /** Render leader answer (or column header if null). */
  private renderLeaderCell(question: MultipleChoiceSurveyQuestion|null = null) {
    // If no elected leader specified, skip this column
    return nothing;

    // If no question provided, return column header
    /* if (!question) {
      return html`
        <div class="table-cell">Your elected leader chose</div>
      `;
    } */
    // Otherwise, render leader answer
  }

  private renderIcon(correctAnswer: string, selectedAnswer: string) {
    if (correctAnswer === selectedAnswer) {
      return html`<pr-icon color="success" icon="check_circle"></pr-icon>`;
    } else {
      return html`<pr-icon color="error" icon="cancel"></pr-icon>`;
    }
  }

  private renderQuestion(
    question: MultipleChoiceSurveyQuestion, maxOptions: number
  ) {
    const participantAnswer =
      this.answer?.answerMap[question.id] as MultipleChoiceSurveyAnswer;

    const extraCells = maxOptions - question.options.length;
    const answer = question.options.find(
      option => option.id === participantAnswer?.choiceId ?? ''
    );

    return html`
      <div class="table-row">
        ${question.options.map(option =>
          html`<div class="table-cell">${option.text}</div>`
        )}
        ${[...Array(extraCells).keys()].map(num =>
          html`<div class="table-cell"></div>`
        )}
        <div class="table-cell">
          ${this.renderIcon(question.correctAnswerId ?? '', participantAnswer?.choiceId ?? null)}
          <div>${answer?.text ?? ''}</div>
        </div>
        ${this.renderLeaderCell(question)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "survey-reveal-view": SurveyReveal;
  }
}
