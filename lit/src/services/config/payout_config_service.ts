import { computed, makeObservable, observable } from "mobx";

import { Service } from "../service";

import {
  PayoutBundle,
  PayoutBundleStrategy,
  PayoutCurrency,
  PayoutItem,
  PayoutItemKind,
  PayoutItemStrategy,
  PayoutStageConfig
} from "@llm-mediation-experiments/utils";

/** Manages metadata for payout stage config. */
export class PayoutConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable stage: PayoutStageConfig|null = null;

  @computed get name() {
    return this.stage?.name;
  }

  @computed get description() {
    return this.stage?.description ?? '';
  }

  @computed get payouts() {
    return this.stage?.payouts ?? [];
  }

  updateName(name: string) {
    if (this.stage) {
      this.stage.name = name;
    }
  }

  updatePayoutCurrency(currency: PayoutCurrency) {
    if (this.stage) {
      this.stage.currency = currency;
    }
  }

  updateDescription(description: string) {
    if (this.stage) {
      this.stage.description = description;
    }
  }

  addRatingSurveyPayoutItemToBundle(
    bundleIndex: number,
    surveyStageId: string
  ) {
    const payouts = this.stage?.payouts;
    if (payouts && bundleIndex >= 0 && bundleIndex < payouts.length) {
      this.stage!.payouts[bundleIndex].payoutItems.push({
        kind: PayoutItemKind.RatingSurvey,
        strategy: PayoutItemStrategy.AddAll,
        fixedCurrencyAmount: 0,
        surveyStageId,
        currencyAmountPerQuestion: 0,
      });
    }
  }

  updatePayoutItem(
    bundleIndex: number, itemIndex: number, updatedItem: Partial<PayoutItem>
  ) {
    const payouts = this.stage?.payouts;
    if (payouts && bundleIndex >= 0 && bundleIndex < payouts.length) {
      const bundle = payouts[bundleIndex];
      if (itemIndex >= 0 && itemIndex < bundle.payoutItems.length) {
        const item = bundle.payoutItems[itemIndex];
        this.stage!.payouts[bundleIndex].payoutItems[itemIndex]
          = { ...item, ...updatedItem };
      }
    }
  }

  removePayoutItem(bundleIndex: number, itemIndex: number) {
    const payouts = this.stage?.payouts;
    if (payouts && bundleIndex >= 0 && bundleIndex < payouts.length) {
      const bundle = payouts[bundleIndex];
      if (itemIndex >= 0 && itemIndex < bundle.payoutItems.length) {
        bundle.payoutItems = [
          ...bundle.payoutItems.slice(0, itemIndex),
          ...bundle.payoutItems.slice(itemIndex + 1)
        ];
      }
    }
  }

  addPayoutBundle() {
    this.stage!.payouts.push({
      name: "",
      strategy: PayoutBundleStrategy.AddPayoutItems,
      payoutItems: [],
    });
  }

  updatePayoutBundle(index: number, updatedBundle: Partial<PayoutBundle>) {
    const payouts = this.stage?.payouts;
    if (payouts && index >= 0 && index < payouts.length) {
      const bundle = this.stage!.payouts[index];
      this.stage!.payouts[index] = { ...bundle, ...updatedBundle };
    }
  }

  movePayoutBundleUp(index: number) {
    const payouts = this.stage?.payouts;
    if (payouts) {
      this.stage!.payouts = [
        ...payouts.slice(0, index - 1),
        ...payouts.slice(index, index + 1),
        ...payouts.slice(index - 1, index),
        ...payouts.slice(index + 1)
      ];
    }
  }

  movePayoutBundleDown(index: number) {
    const payouts = this.stage?.payouts;
    if (payouts) {
      this.stage!.payouts = [
        ...payouts.slice(0, index),
        ...payouts.slice(index + 1, index + 2),
        ...payouts.slice(index, index + 1),
        ...payouts.slice(index + 2)
      ];
    }
  }

  deletePayoutBundle(index: number) {
    const payouts = this.stage?.payouts;
    if (payouts) {
      this.stage!.payouts = [
        ...payouts.slice(0, index),
        ...payouts.slice(index + 1)
      ];
    }
  }

  reset() {
    this.stage = null;
  }
}