import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  MultipleChoiceSurveyAnswer,
  PayoutStageConfig,
  StageConfig,
  StageGame,
  StageKind,
} from '@deliberation-lab/utils';
import {
  LAS_ITEMS,
  LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID,
  LAS_PART_2_ELECTION_STAGE_ID,
  LAS_PART_3_LEADER_TASK_SURVEY_ID,
  LAS_PAYMENT_PART_1_DESCRIPTION,
  LAS_PAYMENT_PART_3_DESCRIPTION,
  LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION,
  getCorrectLASAnswer
} from '../../shared/games/lost_at_sea';

import {styles} from './payout_view.scss';

export interface PayoutItem {
  stageId: string;
  currencyAmountPerQuestion: number;
  fixedCurrencyAmount: number;
}

export interface AnswerItem {
  item1: string;
  item2: string;
  answer: string;
  userAnswer: string;
  isLeader: boolean;
}

/** Payout stage view for participants. */
// TODO: Generalize for all experiments, not just LAS game
@customElement('payout-view')
export class PayoutView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: PayoutStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    if (this.stage.game !== StageGame.LAS) {
      return html`
        <stage-description .stage=${this.stage}></stage-description>
        <div>No payout view available at this time.</div>
        <stage-footer></stage-footer>
      `;
    }

    const item1: PayoutItem = {
      stageId: LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID,
      currencyAmountPerQuestion: 2,
      fixedCurrencyAmount: 3,
    };

    const item2: PayoutItem = {
      stageId: LAS_PART_3_LEADER_TASK_SURVEY_ID,
      currencyAmountPerQuestion: 2,
      fixedCurrencyAmount: 6,
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="stages-wrapper">
        <div class="scoring-bundle">
          <h2>Part 1 payoff</h2>
          <div class="scoring-description">${LAS_PAYMENT_PART_1_DESCRIPTION}</div>
          ${this.renderScoringItem(item1)}
        </div>
        <div class="scoring-bundle">
          <h2>Parts 2 and 3 payoff</h2>
          <div class="scoring-description">${LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION}</div>
          ${this.renderScoringItem(item2)}
        </div>
      </div>
      <stage-footer></stage-footer>
    `;
  }

  private renderScoringItem(item: PayoutItem) {
    const stage = this.experimentService.getStage(item.stageId);
    const renderFixedAmount = () => {
      if (item.fixedCurrencyAmount === 0) {
        return nothing;
      }
      return html`
        <div class="chip secondary">
          £${item.fixedCurrencyAmount}
        </div>
        fixed +
      `;
    }

    const answerItem = this.getAnswerItem(item);
    const multiplier = answerItem.userAnswer === answerItem.answer ? 1 : 0;

    return html`
      <div class="scoring-item">
        <h3>${stage.name}</h3>
        ${item.stageId === LAS_PART_3_LEADER_TASK_SURVEY_ID ?
          html`<div class="scoring-description">${LAS_PAYMENT_PART_3_DESCRIPTION}</div>` : nothing}
        ${this.renderAnswerItem(answerItem)}
        <div class="amount-wrapper">
          ${renderFixedAmount()}
          <div class="chip secondary">
            £${item.currencyAmountPerQuestion}
          </div>
          x ${multiplier} correct questions =
          <div class="chip">
            £${item.fixedCurrencyAmount +
                item.currencyAmountPerQuestion * multiplier}
            total
          </div>
        </div>
      </div>
    `;
  }

  private getAnswerItem(item: PayoutItem): AnswerItem {
    let item1 = '';
    let item2 = '';
    let answer = '';
    let userAnswer = '';
    let isLeader = item.stageId === LAS_PART_3_LEADER_TASK_SURVEY_ID;

    const surveyAnswers = this.cohortService.stagePublicDataMap[item.stageId];
    if (surveyAnswers && surveyAnswers.kind === StageKind.SURVEY) {
      // Find public ID for participant whose answers will be used
      let participantId = this.participantService.profile?.publicId ?? '';
      if (isLeader) {
        const leader = this.cohortService.stagePublicDataMap[LAS_PART_2_ELECTION_STAGE_ID];
        if (leader && leader.kind === StageKind.ELECTION && leader.currentWinner !== '') {
          participantId = leader.currentWinner;
        } else {
          isLeader = false;
        }
      }

      const userAnswerMap = surveyAnswers.participantAnswerMap[participantId];
      if (!userAnswerMap || Object.values(userAnswerMap).length === 0) {
         return { item1, item2, answer, userAnswer, isLeader };
      }

      const ans = Object.values(userAnswerMap)[0] as MultipleChoiceSurveyAnswer;
      const segments = ans.id.split('-');
      item1 = segments[1];
      item2 = segments[2];
      userAnswer = ans.choiceId;
      answer = getCorrectLASAnswer(item1, item2);
    }

    return { item1, item2, answer, userAnswer, isLeader };
  }

  private renderAnswerItem(item: AnswerItem) {
    const getName = (id: string) => {
      return LAS_ITEMS[id].name;
    };

    return html`
      <div class="answer-item">
        <div class="primary">
          ${getName(item.item1)} vs.
          ${getName(item.item2)}
        </div>
        <div class="result">Correct answer: ${getName(item.answer)}</div>
        <div class="result">
          Your ${item.isLeader ? "leader's " : ''}answer:
          <span class="chip secondary">${getName(item.userAnswer)}</span>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'payout-view': PayoutView;
  }
}