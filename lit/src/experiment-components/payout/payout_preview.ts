import "../footer/footer";
import "../progress/progress_stage_completed";
import "../election/election_reveal";
import "../games/lost_at_sea/las_result";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  ItemName,
  ITEMS,
  LostAtSeaSurveyStageAnswer,
  LostAtSeaQuestionAnswer,
  PayoutCurrency,
  PayoutStageConfig,
  ScoringBundle,
  ScoringItem,
  ScoringQuestion,
  StageKind,
  LostAtSeaSurveyStagePublicData,
  VoteForLeaderStagePublicData,
} from "@llm-mediation-experiments/utils";
import { AnswerItem } from "../../shared/types";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";

import { styles } from "./payout_preview.scss";

/** Payout preview */
@customElement("payout-preview")
export class PayoutPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: PayoutStageConfig|null = null;

  override render() {
    if (this.stage === null) {
      return nothing;
    }

    const scoring = this.stage.scoring ?? [];

    return html`
      <div class="description">${this.stage?.description}</div>

      <div class="stages-wrapper">
        ${scoring.map(bundle => this.renderScoringBundle(bundle))}
      </div>
      <stage-footer .disabled=${!this.participantService.isCurrentStage()}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderScoringBundle(bundle: ScoringBundle) {
    return html`
      <div class="scoring-bundle">
        <h2>${bundle.name}</h2>
        ${bundle.scoringItems.map(item => this.renderScoringItem(item))}
      </div>
    `;
  }

  private renderAmount(amount: number) {
    return this.stage?.currency === PayoutCurrency.USD ? `$${amount}` : `€${amount}`;
  }

  private getAnswerItems(item: ScoringItem): AnswerItem[] {
    // Use leader's answers if indicated, else current participant's answers

    if (item.leaderStageId && item.leaderStageId.length > 0) {
      const leaderPublicId = (this.experimentService.publicStageDataMap[item.leaderStageId] as VoteForLeaderStagePublicData).currentLeader ?? '';
      const leaderAnswers = (this.experimentService.publicStageDataMap[item.surveyStageId] as LostAtSeaSurveyStagePublicData).participantAnswers[leaderPublicId];

      return item.questions.map((question) => {
        return {
          ...question,
          leaderPublicId,
          userAnswer: (leaderAnswers[question.id] as LostAtSeaQuestionAnswer).choice,
        };
      });
    }

    const userAnswers = (this.participantService.stageAnswers[item.surveyStageId] as LostAtSeaSurveyStageAnswer).answers;
    return item.questions.map((question) => {
      return {
        ...question,
        userAnswer: (userAnswers[question.id] as LostAtSeaQuestionAnswer).choice,
      };
    });
  }

  private renderScoringItem(item: ScoringItem) {
    const answerItems: AnswerItem[] = this.getAnswerItems(item);
    const numCorrect = () => {
      let count = 0;
      answerItems.forEach(answer => {
        if (answer.userAnswer === answer.answer) {
          count += 1;
        }
      });
      return count;
    };

    return html`
      <div class="scoring-item">
        <h3>${this.experimentService.getStageName(item.surveyStageId)}</h3>
        ${answerItems.map(answerItem => this.renderAnswerItem(answerItem))}
        <div class="amount-wrapper">
          <div class="chip secondary">
            ${this.renderAmount(item.fixedCurrencyAmount)}
          </div>
          fixed +
          <div class="chip secondary">
            ${this.renderAmount(item.currencyAmountPerQuestion)}
          </div>
            x ${numCorrect()} correct questions =
          <div class="chip">
            ${this.renderAmount(item.fixedCurrencyAmount + item.currencyAmountPerQuestion * numCorrect())}
            total
          </div>
        </div>
      </div>
    `;
  }

  private renderAnswerItem(item: AnswerItem) {
    const getName = (id: string) => {
      return ITEMS[id as ItemName].name;
    };

    return html`
      <div class="answer-item">
        <div class="primary">
          ${getName(item.questionOptions[0])}
          vs.
          ${getName(item.questionOptions[1])}
        </div>
        <div class="result">Correct answer: ${getName(item.answer)}</div>
        <div class="result">Your ${item.leaderPublicId ? "leader\'s " : ""}answer:
          <span class="chip secondary">${getName(item.userAnswer)}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "payout-preview": PayoutPreview;
  }
}
