import "../../pair-components/button"
import "../../pair-components/icon_button";
import "../../pair-components/menu";
import "../../pair-components/textarea"

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  PayoutBundle,
  PayoutBundleStrategy,
  PayoutCurrency,
  PayoutItem,
  StageConfig
} from "@llm-mediation-experiments/utils";

import { core } from "../../core/core";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { PayoutConfigService } from "../../services/config/payout_config_service";

import { getElectionStages } from "../../shared/utils";
import { getLostAtSeaSurveyStages, getRatingQuestionIds, getRandomRatingQuestionIds } from "../../shared/lost_at_sea/utils";

import { styles } from "./payout_config.scss";

/** Payout config */
@customElement("payout-config")
export class PayoutConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly payoutConfig = core.getService(PayoutConfigService);

  override render() {
    const addPayoutBundle = () => {
      this.payoutConfig.addPayoutBundle();
    }

    const handleCurrency = (currency: PayoutCurrency) => {
      this.payoutConfig.updatePayoutCurrency(currency);
    }

    return html`
      <div class="title-wrapper">
        <div class="title">Payout groups</div>
        <pr-button @click=${addPayoutBundle}>Add new payout group</pr-button>
      </div>
      <div class="description">
        All payout groups will be added together to calculate the total
        payout
      </div>
      <div class="options-wrapper">
        <div class="options-title">Currency</div>
        <div class="options col">
          <div
            role="button"
            class="option ${this.payoutConfig.stage?.currency === PayoutCurrency.USD ? 'selected': ''}"
            @click=${() => { handleCurrency(PayoutCurrency.USD)}}
          >
            US Dollar (USD)
          </div>
          <div
            role="button"
            class="option ${this.payoutConfig.stage?.currency === PayoutCurrency.EUR ? 'selected': ''}"
            @click=${() => { handleCurrency(PayoutCurrency.EUR)}}
          >
            Euro (EUR)
          </div>
        </div>
      </div>
      <div class="payouts-wrapper">
        ${this.payoutConfig.payouts.map(
          (bundle, index) => this.renderPayoutBundle(bundle, index)
        )}
      </div>
    `;
  }

  private renderPayoutBundle(payoutBundle: PayoutBundle, index: number) {
    const handleMoveUp = (e: Event) => {
      this.payoutConfig.movePayoutBundleUp(index);
      e.stopPropagation();
    };

    const handleMoveDown = (e: Event) => {
      this.payoutConfig.movePayoutBundleDown(index);
      e.stopPropagation();
    };

    const handleDelete = (e: Event) => {
      this.payoutConfig.deletePayoutBundle(index);
    };

    const updatePayoutBundleName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.payoutConfig.updatePayoutBundle(index, { name: value });
    };

    const handleStrategy = (strategy: PayoutBundleStrategy) => {
      this.payoutConfig.updatePayoutBundle(index, { strategy });
    };

    const addRatingSurveyPayoutItem = () => {
      const surveys = getLostAtSeaSurveyStages(this.experimentConfig.stages);
      if (surveys.length === 0) return;

      this.payoutConfig.addRatingSurveyPayoutItemToBundle(
        index, surveys[0].id, getRatingQuestionIds(surveys[0]),
      );
    };

    return html`
      <div class="payout-bundle">
        <div class="header">
          <pr-textarea
            placeholder="Untitled payout group"
            size="medium"
            .value=${payoutBundle.name ?? ""}
            @input=${updatePayoutBundleName}
          >
          </pr-textarea>
          <div class="buttons">
            <pr-icon-button
              color="neutral"
              icon="arrow_upward"
              padding="small"
              size="small"
              variant="default"
              ?disabled=${index === 0}
              @click=${handleMoveUp}
            >
            </pr-icon-button>
            <pr-icon-button
              color="neutral"
              icon="arrow_downward"
              padding="small"
              size="small"
              variant="default"
              ?disabled=${index === this.payoutConfig.payouts.length - 1}
              @click=${handleMoveDown}
            >
            </pr-icon-button>
            <pr-icon-button
              color="error"
              icon="delete"
              padding="small"
              size="small"
              variant="default"
              @click=${handleDelete}
            >
            </pr-icon-button>
          </div>
        </div>
        <div class="options-wrapper">
          <div class="options-title">Payout strategy</div>
          <div class="options col">
            <div
              role="button"
              class="option ${payoutBundle.strategy === PayoutBundleStrategy.AddPayoutItems ? 'selected': ''}"
              @click=${() => { handleStrategy(PayoutBundleStrategy.AddPayoutItems)}}
            >
              Add all payout items together
            </div>
            <div
              role="button"
              class="option ${payoutBundle.strategy === PayoutBundleStrategy.ChoosePayoutItem ? 'selected': ''}"
              @click=${() => { handleStrategy(PayoutBundleStrategy.ChoosePayoutItem)}}
            >
              Choose one of the following payout items
            </div>
          </div>
        </div>
        <div class="buttons">
          <pr-button
            color="secondary"
            variant="default"
            ?disabled=${getLostAtSeaSurveyStages(this.experimentConfig.stages).length === 0}
            @click=${addRatingSurveyPayoutItem}
          >
            Add payout item
          </pr-button>
        </div>
        ${payoutBundle.payoutItems.map(
          (item, itemIndex) => this.renderPayoutItem(item, itemIndex, index)
        )}
      </div>
    `;
  }

  private renderPayoutItem(
    payoutItem: PayoutItem, itemIndex: number, bundleIndex: number
  ) {
    const handleDelete = () => {
      this.payoutConfig.removePayoutItem(bundleIndex, itemIndex);
    };

    return html`
      <div class="payout-item">
        <div class="header">
          <div>
            Payout item:
            ${this.experimentConfig.getStage(payoutItem.surveyStageId)!.name}
          </div>
          <pr-icon-button
            color="neutral"
            icon="close"
            padding="small"
            size="small"
            variant="default"
            @click=${handleDelete}
          >
          </pr-icon-button>
        </div>
        ${this.renderSurveyStageOptions(payoutItem, itemIndex, bundleIndex)}
        ${this.renderSurveyQuestionOptions(payoutItem, itemIndex, bundleIndex)}
        ${this.renderSurveyAmountOptions(payoutItem, itemIndex, bundleIndex)}
        ${this.renderElectionStageOptions(payoutItem, itemIndex, bundleIndex)}
      </div>
    `;
  }

  private renderSurveyStageOptions(payoutItem: PayoutItem, itemIndex: number, bundleIndex: number) {
    const updateSurveyStageId = (surveyStageId: string) => {
      this.payoutConfig.updatePayoutItem(
        bundleIndex, itemIndex, { surveyStageId }
      );
    };

    return html`
      <div class="options-wrapper">
        <div class="options-title">Survey used for answers</div>
        <div class="options">
          ${getLostAtSeaSurveyStages(this.experimentConfig.stages).map(stage =>
          html`
            <div
              role="button"
              class="option ${payoutItem.surveyStageId === stage.id ? 'selected' : ''}"
              @click=${() => {updateSurveyStageId(stage.id)}}
            >
              ${stage.name}
            </div>
          `
          )}
        </div>
      </div>
    `;
  }

  private renderSurveyQuestionOptions(payoutItem: PayoutItem, itemIndex: number, bundleIndex: number) {
    const surveyStage = this.experimentConfig.getStage(payoutItem.surveyStageId);
    if (!surveyStage) return;

    const updateSurveyQuestionIds = (allQuestions: boolean) => {
      if (allQuestions) {
        this.payoutConfig.updatePayoutItem(
          bundleIndex, itemIndex, { surveyQuestionIds: getRatingQuestionIds(surveyStage) }
        );
      } else {
        this.payoutConfig.updatePayoutItem(
          bundleIndex, itemIndex, { surveyQuestionIds: getRandomRatingQuestionIds(surveyStage) }
        );
      }
    };

    return html`
      <div class="options-wrapper">
        <div class="options-title">Survey questions to use</div>
        <div class="options">
          <div
            role="button"
            class="option ${payoutItem.surveyQuestionIds.length > 1 ? 'selected': ''}"
            @click=${() => {updateSurveyQuestionIds(true)}}
          >
            Use all questions
          </div>
          <div
            role="button"
            class="option ${payoutItem.surveyQuestionIds.length === 1 ? 'selected' : ''}"
            @click=${() => {updateSurveyQuestionIds(false)}}
          >
            Randomly select one question
          </div>
        </div>
      </div>
    `;
  }

  private renderSurveyAmountOptions(payoutItem: PayoutItem, itemIndex: number, bundleIndex: number) {
    const updateQuestionAmount = (e: Event) => {
      const currencyAmountPerQuestion = Number((e.target as HTMLTextAreaElement).value);
      this.payoutConfig.updatePayoutItem(bundleIndex, itemIndex, { currencyAmountPerQuestion })
    };

    const updateFixedAmount = (e: Event) => {
      const fixedCurrencyAmount = Number((e.target as HTMLTextAreaElement).value);
      this.payoutConfig.updatePayoutItem(bundleIndex, itemIndex, { fixedCurrencyAmount })
    };

    return html`
      <div class="number-input">
        <label>Amount per question</label>
        <div class="input-wrapper">
          <div>${this.payoutConfig.stage?.currency === PayoutCurrency.USD ? '$' : '€'}</div>
          <input
            type="number"
            .value=${payoutItem.currencyAmountPerQuestion}
            @input=${updateQuestionAmount}
          />
        </div>
      </div>
      <div class="number-input">
        <label>Fixed amount (to add at the end)</label>
        <div class="input-wrapper">
          <div>${this.payoutConfig.stage?.currency === PayoutCurrency.USD ? '$' : '€'}</div>
          <input
            .value=${payoutItem.fixedCurrencyAmount}
            @input=${updateFixedAmount}
            type="number"
          />
        </div>
      </div>
    `;
  }

  private renderElectionStageOptions(payoutItem: PayoutItem, itemIndex: number, bundleIndex: number) {
    const updateLeaderStageId = (leaderStageId: string) => {
      this.payoutConfig.updatePayoutItem(
        bundleIndex, itemIndex, { leaderStageId }
      );
    };

    return html`
      <div class="options-wrapper">
        <div class="options-title">Evaluate answers from</div>
        <div class="options">
          <div
            role="button"
            class="option ${!payoutItem.leaderStageId || payoutItem.leaderStageId === '' ? 'selected' : ''}"
            @click=${() => {updateLeaderStageId('')}}
          >
            Current participant
          </div>
          ${getElectionStages(this.experimentConfig.stages).map(
            stage => html`
              <div
                role="button"
                class="option ${payoutItem.leaderStageId === stage.id ? 'selected' : ''}"
                @click=${() => {updateLeaderStageId(stage.id)}}
              >
                Leader from: ${stage.name}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "payout-config": PayoutConfig;
  }
}
