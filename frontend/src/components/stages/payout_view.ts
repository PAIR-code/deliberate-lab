import '../progress/progress_stage_completed';
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
  DefaultPayoutItem,
  DefaultPayoutItemResult,
  MultipleChoiceSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  PayoutCurrency,
  PayoutItem,
  PayoutItemType,
  PayoutStageConfig,
  PayoutResultConfig,
  PayoutItemResult,
  StageConfig,
  StageGame,
  StageKind,
  SurveyPayoutItem,
  SurveyPayoutItemResult,
  SurveyPayoutQuestionResult,
  SurveyQuestionKind,
  calculatePayoutResult,
  calculatePayoutTotal
} from '@deliberation-lab/utils';
import {
  LAS_ITEMS,
  LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID,
  LAS_PART_2_ELECTION_STAGE_ID,
  LAS_PART_3_LEADER_TASK_SURVEY_ID,
  LAS_PAYMENT_PART_1_DESCRIPTION,
  LAS_PAYMENT_PART_3_DESCRIPTION,
  LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION,
  getCorrectLASAnswer,
} from '../../shared/games/lost_at_sea';

import {styles} from './payout_view.scss';

/** Payout stage view for participants. */
// TODO: Generalize for all experiments, not just LAS game
@customElement('payout-view')
export class PayoutView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: PayoutStageConfig | null = null;
  @property() renderSummaryView: boolean = false; // If true, render a minimized summary view.

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    const resultConfig = calculatePayoutResult(
      this.stage,
      this.experimentService.stageConfigMap,
      this.cohortService.stagePublicDataMap,
      this.participantService.profile
    );

    return html`
      ${this.renderSummaryView ? '' : html`<stage-description .stage=${this.stage}></stage-description>`}
      <div class="stages-wrapper">
        ${resultConfig.results.map((result) =>
          this.renderPayoutItemResult(result, resultConfig.currency)
        )}
        ${this.renderTotalPayout(resultConfig)}
      </div>
      ${this.renderSummaryView
        ? ''
        : html`<stage-footer>
            ${this.stage.progress.showParticipantProgress
              ? html`<progress-stage-completed></progress-stage-completed>`
              : nothing}
          </stage-footer>`}
    `;
  }

  private renderTotalPayout(resultConfig: PayoutResultConfig) {
    const total = calculatePayoutTotal(resultConfig);

    return html`
      <div class="scoring-bundle row">
        <h2>Final payout</h2>
        <div class="chip primary">
          ${this.renderCurrency(total, resultConfig.currency)}
        </div>
      </div>
    `;
  }

  private renderCurrency(amount: number, currency: PayoutCurrency) {
    switch (currency) {
      case PayoutCurrency.EUR:
        return `€${amount}`;
      case PayoutCurrency.GBP:
        return `£${amount}`;
      case PayoutCurrency.USD:
        return `$${amount}`;
      default:
        return `${amount}`;
    }
  }

  private renderPayoutItemResult(
    item: PayoutItemResult,
    currency: PayoutCurrency
  ) {
    switch (item.type) {
      case PayoutItemType.DEFAULT:
        return this.renderDefaultPayoutItemResult(item, currency);
      case PayoutItemType.SURVEY:
        return this.renderSurveyPayoutItemResult(item, currency);
      default:
        return nothing;
    }
  }

  private renderDefaultPayoutItemResult(
    item: DefaultPayoutItemResult,
    currency: PayoutCurrency
  ) {
    return html`
      <div class="scoring-item">
        ${this.renderBaseAmountEarned(item, currency)}
      </div>
    `;
  }

  private renderBaseAmountEarned(
    item: PayoutItemResult,
    currency: PayoutCurrency
  ) {
    return html`
      <div class="scoring-item">
        <h2>Payout for completing stage</h2>
        <div class="row">
          <div>Stage completed?</div>
          <div class="chip secondary">
            ${item.completedStage ? 'yes' : 'no'}
          </div>
        </div>
        <div class="row">
          <div>Payout earned:</div>
          <div class="chip secondary">
            ${this.renderCurrency(item.baseAmountEarned, currency)}
          </div>
        </div>
      </div>
    `;
  }

  private renderSurveyPayoutItemResult(
    item: SurveyPayoutItemResult,
    currency: PayoutCurrency
  ) {
    let total = item.baseAmountEarned;
    item.questionResults.forEach((result) => {
      total += result.amountEarned;
    });

    return html`
      <div class="scoring-bundle">
        <h2>${item.name}</h2>
        <div class="scoring-description">${item.description}</div>
        ${this.renderBaseAmountEarned(item, currency)}
        ${item.questionResults.map((result) =>
          this.renderSurveyPayoutQuestionResult(
            result,
            item.rankingWinner,
            currency
          )
        )}
        <div class="scoring-item row">
          <h2>Stage payout</h2>
          <div class="chip primary">
            ${this.renderCurrency(total, currency)}
          </div>
        </div>
      </div>
    `;
  }

  private renderSurveyPayoutQuestionResult(
    result: SurveyPayoutQuestionResult,
    rankingWinner: string | null,
    currency: PayoutCurrency
  ) {
    const correctAnswer = result.question.options.find(
      (option) => option.id === result.question.correctAnswerId
    );
    const participantAnswer = result.question.options.find(
      (option) => option.id === result.answerId
    );

    return html`
      <div class="scoring-item">
        <div class="column">
          <h2>${result.question.questionTitle}</h2>
          <div class="primary">
            ${result.question.options.map((option) => option.text).join(', ')}
          </div>
          <div class="row">
            <div>Correct answer:</div>
            <div class="chip secondary">${correctAnswer?.text ?? ''}</div>
          </div>
          <div class="row">
            <div>
              ${rankingWinner !== null
                ? `Election winner's answer:`
                : 'Your answer:'}
            </div>
            <div class="chip secondary">${participantAnswer?.text ?? ''}</div>
          </div>
        </div>
        <div class="row">
          <div>Payout earned:</div>
          <div class="chip secondary">
            ${this.renderCurrency(result.amountEarned, currency)}
          </div>
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
