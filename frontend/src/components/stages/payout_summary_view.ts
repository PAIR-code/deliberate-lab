import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  ChipPayoutItemResult,
  ChipPayoutValueItem,
  DefaultPayoutItem,
  DefaultPayoutItemResult,
  MultipleChoiceSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  PayoutCurrency,
  PayoutItem,
  PayoutItemType,
  PayoutStageConfig,
  PayoutStageParticipantAnswer,
  PayoutResultConfig,
  PayoutItemResult,
  StageConfig,
  StageKind,
  SurveyPayoutItem,
  SurveyPayoutItemResult,
  SurveyPayoutQuestionResult,
  SurveyQuestionKind,
  calculatePayoutResult,
  calculatePayoutTotal,
} from '@deliberation-lab/utils';
import {styles} from './payout_view.scss';

/** Payout stage summary view. */
@customElement('payout-summary-view')
export class PayoutView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: PayoutStageConfig | null = null;
  @property() answer: PayoutStageParticipantAnswer | null = null;

  override render() {
    if (!this.stage || !this.answer || !this.participantService.profile) {
      return nothing;
    }

    const resultConfig = calculatePayoutResult(
      this.stage,
      this.answer,
      this.experimentService.stageConfigMap,
      this.cohortService.stagePublicDataMap,
      this.participantService.profile,
    );

    return html`
      <div class="stages-wrapper">
        ${resultConfig.results.map((result) =>
          this.renderPayoutItemResult(result, resultConfig.currency),
        )}
        ${this.renderTotalPayout(resultConfig)}
      </div>
    `;
  }

  private renderTotalPayout(resultConfig: PayoutResultConfig) {
    const total = calculatePayoutTotal(resultConfig);
    const averageNote = resultConfig.averageAllPayoutItems ? ' (average)' : '';

    return html`
      <div class="scoring-bundle row">
        <h2>Final payout${averageNote}</h2>
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
    currency: PayoutCurrency,
  ) {
    switch (item.type) {
      case PayoutItemType.CHIP:
        return this.renderChipPayoutItemResult(item, currency);
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
    currency: PayoutCurrency,
  ) {
    return html`
      <div class="scoring-bundle">
        <h2>${item.name}</h2>
        <div class="scoring-description">${item.description}</div>
        ${this.renderBaseAmountEarned(item, currency)}
      </div>
    `;
  }

  private renderChipPayoutItemResult(
    item: ChipPayoutItemResult,
    currency: PayoutCurrency,
  ) {
    const getInitialTotal = () => {
      let total = 0;
      item.chipResults.forEach((result) => {
        total +=
          Math.floor(result.chip.startingQuantity * result.value * 100) / 100;
      });
      return Math.floor(total * 100) / 100;
    };

    const getTotal = () => {
      let total = 0;
      for (const result of item.chipResults) {
        total += Math.floor(result.quantity * result.value * 100) / 100;
      }
      return Math.floor(total * 100) / 100;
    };

    const renderChipValue = (result: ChipPayoutValueItem) => {
      const quantity = result.quantity;
      const value = result.value;
      const total = Math.floor(quantity * value * 100) / 100;
      const chipName = `${result.chip.avatar} ${result.chip.name}`;

      return html`
        <div class="row">
          <div class="chip secondary">
            ${this.renderCurrency(total, currency)}
          </div>
          <div>
            ${chipName} chips (${quantity} chips x
            ${this.renderCurrency(value, currency)})
          </div>
        </div>
      `;
    };

    const bonusPayout = parseFloat(
      Math.max(0, getTotal() - getInitialTotal()).toFixed(2),
    );
    return html`
      <div class="scoring-bundle">
        <h2>${item.name}</h2>
        <div class="scoring-description">${item.description}</div>
        ${this.renderBaseAmountEarned(item, currency)}
        <div class="scoring-item">
          <h2>Chip payout</h2>
          ${item.chipResults.map((result) => renderChipValue(result))}

          <div class="row">
            <div>Initial chip value</div>
            <div class="chip secondary">
              ${this.renderCurrency(getInitialTotal(), currency)}
            </div>
          </div>

          <div class="row">
            <div>Final chip value</div>
            <div class="chip secondary">
              ${this.renderCurrency(getTotal(), currency)}
            </div>
          </div>

          <div class="row">
            <div>Final payout (0 if negative)</div>
            <div class="chip secondary">
              ${this.renderCurrency(bonusPayout, currency)}
            </div>
          </div>
        </div>
        <div class="scoring-item row">
          <h2>Stage payout</h2>
          <div class="chip primary">
            ${this.renderCurrency(
              bonusPayout + item.baseAmountEarned,
              currency,
            )}
          </div>
        </div>
      </div>
    `;
  }

  private renderBaseAmountEarned(
    item: PayoutItemResult,
    currency: PayoutCurrency,
  ) {
    if (item.baseCurrencyAmount === 0) {
      return nothing;
    }

    return html`
      <div class="scoring-item">
        <h2>Payout for completing stage</h2>
        ${item.description.length > 0
          ? html`<div>${item.description}</div>`
          : nothing}
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
    currency: PayoutCurrency,
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
            currency,
          ),
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
    currency: PayoutCurrency,
  ) {
    const correctAnswer = result.question.options.find(
      (option) => option.id === result.question.correctAnswerId,
    );
    const participantAnswer = result.question.options.find(
      (option) => option.id === result.answerId,
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
    'payout-summary-view': PayoutView;
  }
}
