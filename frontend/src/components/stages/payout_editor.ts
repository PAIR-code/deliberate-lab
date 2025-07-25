import '../../pair-components/button';
import '../../pair-components/menu';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ChipPayoutItem,
  DefaultPayoutItem,
  MultipleChoiceSurveyQuestion,
  PayoutCurrency,
  PayoutItem,
  PayoutItemType,
  PayoutStageConfig,
  StageConfig,
  StageKind,
  SurveyPayoutItem,
  SurveyQuestion,
  SurveyQuestionKind,
  createChipPayoutItem,
  createDefaultPayoutItem,
  createSurveyPayoutItem,
} from '@deliberation-lab/utils';

import {styles} from './payout_editor.scss';

/** Payout stage editor. */
@customElement('payout-editor')
export class PayoutEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: PayoutStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const index = this.experimentEditor.stages.findIndex(
      (stage) => stage.id === this.stage?.id,
    );

    return html`
      ${this.renderPayoutCurrency()} ${this.renderPayoutAverage()}
      <pr-menu
        name="Add stage payout"
        ?disabled=${!this.experimentEditor.canEditStages}
      >
        <div class="menu-wrapper">
          ${this.experimentEditor.stages
            .slice(0, index)
            .map((stage) => this.renderPayoutStageOption(stage))}
        </div>
      </pr-menu>
      ${this.stage.payoutItems.map((item, index) =>
        this.renderPayoutItem(item, index),
      )}
    `;
  }

  renderPayoutAverage() {
    if (!this.stage) return nothing;

    const updateAverage = () => {
      if (!this.stage) return;
      this.experimentEditor.updateStage({
        ...this.stage,
        averageAllPayoutItems: !this.stage.averageAllPayoutItems,
      });
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${this.stage.averageAllPayoutItems}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${updateAverage}
        >
        </md-checkbox>
        <div>Use the average of all stage payouts as the final payout</div>
      </div>
    `;
  }

  addPayout(stage: StageConfig) {
    if (!this.stage) return;

    const payoutItems: PayoutItem[] = this.stage.payoutItems;
    const stageId = stage.id;
    const name = stage.name;

    switch (stage.kind) {
      case StageKind.CHIP:
        payoutItems.push(createChipPayoutItem({name, stageId}));
        break;
      case StageKind.SURVEY:
        payoutItems.push(createSurveyPayoutItem({name, stageId}));
        break;
      default:
        payoutItems.push(createDefaultPayoutItem({name, stageId}));
    }

    this.experimentEditor.updateStage({
      ...this.stage,
      payoutItems,
    });
  }

  updatePayoutItem(item: PayoutItem, index: number) {
    if (!this.stage) return;

    const payoutItems = [
      ...this.stage.payoutItems.slice(0, index),
      item,
      ...this.stage.payoutItems.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      payoutItems,
    });
  }

  deletePayout(index: number) {
    if (!this.stage) return;

    const payoutItems = [
      ...this.stage.payoutItems.slice(0, index),
      ...this.stage.payoutItems.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      payoutItems,
    });
  }

  movePayoutUp(index: number) {
    if (!this.stage) return;

    const payoutItems = [
      ...this.stage.payoutItems.slice(0, index - 1),
      ...this.stage.payoutItems.slice(index, index + 1),
      ...this.stage.payoutItems.slice(index - 1, index),
      ...this.stage.payoutItems.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      payoutItems,
    });
  }

  movePayoutDown(index: number) {
    if (!this.stage) return;

    const payoutItems = [
      ...this.stage.payoutItems.slice(0, index),
      ...this.stage.payoutItems.slice(index + 1, index + 2),
      ...this.stage.payoutItems.slice(index, index + 1),
      ...this.stage.payoutItems.slice(index + 2),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      payoutItems,
    });
  }

  private renderPayoutStageOption(stage: StageConfig) {
    return html`
      <div
        class="menu-item"
        role="button"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.addPayout(stage);
        }}
      >
        <div>${stage.name}</div>
      </div>
    `;
  }

  private renderPayoutCurrency() {
    if (!this.stage) return nothing;

    const handleCurrency = (currency: PayoutCurrency) => {
      if (!this.stage) return;
      this.experimentEditor.updateStage({
        ...this.stage,
        currency,
      });
    };

    return html`
      <div class="options-wrapper">
        <div class="options-title">Currency</div>
        <div class="options">
          <pr-button
            color=${this.stage.currency === PayoutCurrency.USD
              ? 'primary'
              : 'neutral'}
            variant=${this.stage.currency === PayoutCurrency.USD
              ? 'tonal'
              : 'default'}
            variant="tonal"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => {
              handleCurrency(PayoutCurrency.USD);
            }}
          >
            US Dollar (USD)
          </pr-button>
          <pr-button
            color=${this.stage.currency === PayoutCurrency.EUR
              ? 'primary'
              : 'neutral'}
            variant=${this.stage.currency === PayoutCurrency.EUR
              ? 'tonal'
              : 'default'}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => {
              handleCurrency(PayoutCurrency.EUR);
            }}
          >
            Euro (EUR)
          </pr-button>
          <pr-button
            color=${this.stage.currency === PayoutCurrency.GBP
              ? 'primary'
              : 'neutral'}
            variant=${this.stage.currency === PayoutCurrency.GBP
              ? 'tonal'
              : 'default'}
            variant="tonal"
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${() => {
              handleCurrency(PayoutCurrency.GBP);
            }}
          >
            British pound (GBP)
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderPayoutItem(item: PayoutItem, index: number) {
    switch (item.type) {
      case PayoutItemType.CHIP:
        return this.renderChipPayoutItem(item, index);
      case PayoutItemType.DEFAULT:
        return this.renderDefaultPayoutItem(item, index);
      case PayoutItemType.SURVEY:
        return this.renderSurveyPayoutItem(item, index);
      default:
        return nothing;
    }
  }

  private renderChipPayoutItem(item: ChipPayoutItem, index: number) {
    return html`
      <div class="payout-item">
        ${this.renderBasePayoutEditor(item, index)}
        <div>
          Additional chip payout will be calculated based on changes in chip
          quantities/values.
        </div>
      </div>
    `;
  }

  private renderDefaultPayoutItem(item: DefaultPayoutItem, index: number) {
    return html`
      <div class="payout-item">${this.renderBasePayoutEditor(item, index)}</div>
    `;
  }

  private renderSurveyPayoutItem(item: SurveyPayoutItem, index: number) {
    const stage = this.experimentEditor.getStage(item.stageId);
    if (stage?.kind !== StageKind.SURVEY) return nothing;

    return html`
      <div class="payout-item">
        ${this.renderBasePayoutEditor(item, index)}
        <div class="options-wrapper">
          <div class="subtitle">Participant answers to use for payout</div>
          <div class="options">
            <pr-button
              color=${!item.rankingStageId ? 'primary' : 'neutral'}
              variant=${!item.rankingStageId ? 'tonal' : 'default'}
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${() => {
                this.updatePayoutItem({...item, rankingStageId: null}, index);
              }}
            >
              Current participant
            </pr-button>
            ${this.experimentEditor.stages.map((stage) =>
              this.renderRankingStageOption(stage, item, index),
            )}
          </div>
        </div>
        <div class="options-wrapper">
          <div class="subtitle">
            Select survey questions to use for payout and set payout amount
          </div>
          <div class="survey-questions">
            ${stage.questions.map((question) =>
              this.renderSurveyQuestion(item, question, index),
            )}
          </div>
        </div>
      </div>
    `;
  }

  private renderRankingStageOption(
    stage: StageConfig,
    item: SurveyPayoutItem,
    index: number,
  ) {
    if (stage.kind !== StageKind.RANKING) return nothing;

    const updateRankingStageId = () => {
      this.updatePayoutItem({...item, rankingStageId: stage.id}, index);
    };

    return html`
      <pr-button
        color=${item.rankingStageId === stage.id ? 'primary' : 'neutral'}
        variant=${item.rankingStageId === stage.id ? 'tonal' : 'default'}
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${updateRankingStageId}
      >
        Winner of ${stage.name}
      </pr-button>
    `;
  }

  private renderSurveyQuestion(
    item: SurveyPayoutItem,
    question: SurveyQuestion,
    index: number,
  ) {
    if (question.kind !== SurveyQuestionKind.MULTIPLE_CHOICE) return nothing;

    const updateQuestion = () => {
      const questionMap = item.questionMap;
      if (item.questionMap[question.id]) {
        questionMap[question.id] = null;
      } else {
        questionMap[question.id] = 0;
      }
      this.updatePayoutItem({...item, questionMap}, index);
    };

    const updatePayout = (e: InputEvent) => {
      if (!this.stage) return;
      const num = Number((e.target as HTMLTextAreaElement).value);
      const questionMap = item.questionMap;
      questionMap[question.id] = num;
      this.updatePayoutItem({...item, questionMap}, index);
    };

    const id = `${item.id}-${question.id}`;

    return html`
      <div class="survey-question">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${item.questionMap[question.id]}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateQuestion}
          >
          </md-checkbox>
          <div>
            ${question.questionTitle}
            <span class="subtitle">
              (${question.options.map((option) => option.text).join(', ')})
            </span>
          </div>
        </div>
        <div class="number-input">
          <label for="base-payout"> Base payout for stage </label>
          <input
            type="number"
            id=${id}
            name=${id}
            min="0"
            .value=${item.questionMap[question.id] ?? 0}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updatePayout}
          />
        </div>
      </div>
    `;
  }

  private renderPayoutItemNav(index: number) {
    if (!this.stage) return nothing;
    return html`
      <div class="right">
        <pr-icon-button
          color="neutral"
          icon="arrow_upward"
          padding="small"
          size="small"
          variant="default"
          ?disabled=${index === 0 || !this.experimentEditor.canEditStages}
          @click=${() => {
            this.movePayoutUp(index);
          }}
        >
        </pr-icon-button>
        <pr-icon-button
          color="neutral"
          icon="arrow_downward"
          padding="small"
          size="small"
          variant="default"
          ?disabled=${index === this.stage.payoutItems.length - 1 ||
          !this.experimentEditor.canEditStages}
          @click=${() => {
            this.movePayoutDown(index);
          }}
        >
        </pr-icon-button>
        <pr-icon-button
          icon="close"
          color="neutral"
          padding="small"
          variant="default"
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${() => {
            this.deletePayout(index);
          }}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private renderBasePayoutEditor(item: PayoutItem, index: number) {
    if (!this.stage) return nothing;

    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.updatePayoutItem({...item, name}, index);
    };

    const updateRandomSelectionId = (e: InputEvent) => {
      const randomSelectionId = (e.target as HTMLTextAreaElement).value;
      this.updatePayoutItem({...item, randomSelectionId}, index);
    };

    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      this.updatePayoutItem({...item, description}, index);
    };

    const updateBasePayout = (e: InputEvent) => {
      if (!this.stage) return;

      const baseCurrencyAmount = Number(
        (e.target as HTMLTextAreaElement).value,
      );
      this.updatePayoutItem({...item, baseCurrencyAmount}, index);
    };

    const basePayoutId = `${item.id}-base`;
    const randomSelectionLabel = `
      Random selection group ID: Out of all payout items that share the
      same group ID, one will be randomly selected to use for payout.
      (Leave this field blank if the payout item should always be selected.)
    `;

    return html`
      <div class="base-editor">
        <div class="payout-item-header">
          <div class="left">
            <div class="subtitle">
              Stage payout for:
              ${this.experimentEditor.getStage(item.stageId)?.name}
            </div>
          </div>
          ${this.renderPayoutItemNav(index)}
        </div>
        <pr-textarea
          label="Name"
          placeholder="Name of stage payout"
          variant="outlined"
          .value=${item.name}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateName}
        >
        </pr-textarea>
        <pr-textarea
          label=${randomSelectionLabel}
          variant="outlined"
          .value=${item.randomSelectionId}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateRandomSelectionId}
        >
        </pr-textarea>
        <pr-textarea
          label="Description"
          placeholder="Description for stage payout"
          variant="outlined"
          .value=${item.description}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateDescription}
        >
        </pr-textarea>
        <div class="number-input">
          <label for="base-payout"> Payout for completing stage </label>
          <input
            type="number"
            id=${basePayoutId}
            name=${basePayoutId}
            min="0"
            .value=${item.baseCurrencyAmount ?? 0}
            @input=${updateBasePayout}
          />
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'payout-editor': PayoutEditor;
  }
}
