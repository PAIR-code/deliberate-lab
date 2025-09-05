import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/tooltip';
import '../../pair-components/textarea';

import '@material/web/button/outlined-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/textfield/outlined-text-field.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {
  AssetAllocationStageConfig,
  MultiAssetAllocationStageConfig,
  Stock,
  StageKind,
  StockInfoStageConfig,
  createStock,
  createAssetAllocationStockInfoConfig,
} from '@deliberation-lab/utils';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {styles} from './asset_allocation_editor.scss';

/** Asset Allocation stage editor */
@customElement('asset-allocation-editor')
export class AssetAllocationEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: AssetAllocationStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) return nothing;

    return html`
      <div class="editor-container">
        <div class="header">
          <h3>Asset Allocation Configuration</h3>
        </div>

        <div class="section">
          <h4>Stock Information Source</h4>
          ${this.renderStockInfoStageSelector()}
        </div>

        ${!this.stage.stockConfig.stockInfoStageId
          ? this.renderSimpleStockConfiguration()
          : nothing}
      </div>
    `;
  }

  private renderStockInfoStageSelector() {
    if (!this.stage) return nothing;

    const stockInfoStages = this.getAvailableStockInfoStages();
    const selectedStage =
      stockInfoStages.find(
        (s) => s.id === this.stage!.stockConfig.stockInfoStageId,
      ) ?? null;

    return html`
      <div class="stock-info-selector">
        <div class="info-text">
          <p>
            You can either reference an existing StockInfo stage with exactly 2
            stocks for detailed stock data and charts, or configure stock names
            and descriptions manually (see "Simple stocks" option below).
          </p>
        </div>

        <div class="current-selection">
          <strong>Current selection:</strong>
          ${selectedStage
            ? html`<span class="selected-stage">${selectedStage.name}</span>`
            : html`<span class="no-selection">Simple stocks (no charts)</span>`}
        </div>

        <div class="stage-options">
          <h5>Available StockInfo Stages:</h5>
          ${stockInfoStages.length === 0
            ? html`<p class="no-stages">
                No StockInfo stages with exactly 2 stocks found. Create a
                StockInfo stage with 2 stocks first, then configure this stage.
              </p>`
            : html`
                <div class="stage-list">
                  ${stockInfoStages.map((stage) =>
                    this.renderStockInfoStageOption(stage),
                  )}
                </div>
              `}
        </div>

        <div class="clear-selection">
          <md-outlined-button
            @click=${() => this.clearStockInfoStage()}
            ?disabled=${!this.stage.stockConfig.stockInfoStageId ||
            !this.experimentEditor.canEditStages}
          >
            Use Simple Stocks (No Charts)
          </md-outlined-button>
        </div>
      </div>
    `;
  }

  private renderStockInfoStageOption(stockInfoStage: StockInfoStageConfig) {
    const isSelected =
      this.stage?.stockConfig.stockInfoStageId === stockInfoStage.id;
    const stageIndex = this.experimentEditor.stages.findIndex(
      (s) => s.id === stockInfoStage.id,
    );
    const hasExactlyTwoStocks = stockInfoStage.stocks?.length === 2;
    const isDisabled =
      !this.experimentEditor.canEditStages || !hasExactlyTwoStocks;

    const onSelect = () => {
      if (!this.stage || isDisabled) return;

      this.experimentEditor.updateStage({
        ...this.stage,
        stockConfig: {
          stockInfoStageId: stockInfoStage.id,
          stockA: stockInfoStage.stocks[0] || createStock({name: 'Stock A'}),
          stockB: stockInfoStage.stocks[1] || createStock({name: 'Stock B'}),
        },
      });
    };

    return html`
      <div
        class="stage-option ${isSelected ? 'selected' : ''} ${isDisabled
          ? 'disabled'
          : ''}"
        @click=${onSelect}
      >
        <div class="stage-header">
          <span class="stage-number">${stageIndex + 1}.</span>
          <span class="stage-name">${stockInfoStage.name}</span>
          ${isSelected
            ? html`<span class="selected-indicator">✓</span>`
            : nothing}
        </div>
        <div class="stage-details">
          <span class="stock-count"
            >${stockInfoStage.stocks?.length || 0} stocks</span
          >
          ${hasExactlyTwoStocks
            ? html`<span class="stocks-preview"
                >(${stockInfoStage.stocks[0]?.name || 'Stock A'},
                ${stockInfoStage.stocks[1]?.name || 'Stock B'})</span
              >`
            : html`<span class="warning"
                >⚠️ Asset Allocation requires exactly 2 stocks</span
              >`}
        </div>
      </div>
    `;
  }

  private renderSimpleStockConfiguration() {
    if (!this.stage) return nothing;

    return html`
      <div class="section">
        <h4>Simple Stock Configuration</h4>
        <p class="info-text">
          Configure basic information for two stocks. No charts will be
          displayed.
        </p>

        <div class="simple-stocks">
          <div class="stock-config">
            <h5>Stock A</h5>
            ${this.renderSimpleStockEditor(this.stage.stockConfig.stockA, 'A')}
          </div>

          <div class="stock-config">
            <h5>Stock B</h5>
            ${this.renderSimpleStockEditor(this.stage.stockConfig.stockB, 'B')}
          </div>
        </div>
      </div>
    `;
  }

  private renderSimpleStockEditor(stock: Stock, stockLetter: 'A' | 'B') {
    if (!this.stage) return nothing;

    const updateStock = (updates: Partial<Stock>) => {
      if (!this.stage || !this.experimentEditor.canEditStages) return;

      const updatedStock = {...stock, ...updates};

      this.experimentEditor.updateStage({
        ...this.stage,
        stockConfig: {
          ...this.stage.stockConfig,
          [stockLetter === 'A' ? 'stockA' : 'stockB']: updatedStock,
        },
      });
    };

    return html`
      <div class="simple-stock-editor">
        <md-outlined-text-field
          label="Stock Name"
          value=${stock.name}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            updateStock({name: target.value});
          }}
        ></md-outlined-text-field>

        <md-outlined-text-field
          label="Description (optional)"
          value=${stock.description}
          type="textarea"
          rows="3"
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            updateStock({description: target.value});
          }}
        ></md-outlined-text-field>
      </div>
    `;
  }

  private getAvailableStockInfoStages(): StockInfoStageConfig[] {
    // Get all StockInfo stages that precede this stage
    const currentStageIndex = this.experimentEditor.stages.findIndex(
      (stage) => stage.id === this.stage?.id,
    );

    return this.experimentEditor.stages
      .slice(0, currentStageIndex)
      .filter(
        (stage): stage is StockInfoStageConfig =>
          stage.kind === StageKind.STOCKINFO,
      );
  }

  private clearStockInfoStage() {
    if (!this.stage || !this.experimentEditor.canEditStages) return;

    this.experimentEditor.updateStage({
      ...this.stage,
      stockConfig: createAssetAllocationStockInfoConfig(),
    });
  }
}

@customElement('multi-asset-allocation-editor')
export class MultiAssetAllocationEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: MultiAssetAllocationStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) return nothing;

    return html`
      <div class="section">
        <div class="title">Stock Options</div>
        ${this.renderStockInfoStageSelector()}
      </div>
      ${!this.stage.stockInfoStageId
        ? this.renderSimpleStockConfiguration()
        : nothing}
    `;
  }

  private renderStockInfoStageOption(stockInfoStage: StockInfoStageConfig) {
    const isSelected = this.stage?.stockInfoStageId === stockInfoStage.id;
    const stageIndex = this.experimentEditor.stages.findIndex(
      (s) => s.id === stockInfoStage.id,
    );
    const isDisabled = !this.experimentEditor.canEditStages;

    const onSelect = () => {
      if (!this.stage || isDisabled) return;

      this.experimentEditor.updateStage({
        ...this.stage,
        stockInfoStageId: stockInfoStage.id,
        stockOptions: stockInfoStage.stocks,
      });
    };

    const classes = classMap({
      'stage-option': true,
      selected: isSelected,
      disabled: isDisabled,
    });

    return html`
      <div class=${classes} @click=${onSelect}>
        <div class="stage-header">
          <span class="stage-number">${stageIndex + 1}.</span>
          <span class="stage-name">${stockInfoStage.name}</span>
          ${isSelected
            ? html`<span class="selected-indicator">✓</span>`
            : nothing}
        </div>
        <div class="stage-details">
          <span class="stock-count">
            ${stockInfoStage.stocks?.length || 0} stocks
          </span>
        </div>
      </div>
    `;
  }

  private renderStockInfoStageSelector() {
    if (!this.stage) return nothing;

    const stockInfoStages = this.getAvailableStockInfoStages();
    const selectedStage =
      stockInfoStages.find((s) => s.id === this.stage!.stockInfoStageId) ??
      null;

    return html`
      <div class="stock-info-selector">
        <p class="info-text">
          Reference an existing StockInfo stage for detailed stock data and
          charts, or configure "simple stock" names and descriptions manually:
        </p>

        <div class="stage-options">
          ${stockInfoStages.length === 0
            ? html`<p class="no-stages">No StockInfo stages found.</p>`
            : html`
                <div class="stage-list">
                  ${stockInfoStages.map((stage) =>
                    this.renderStockInfoStageOption(stage),
                  )}
                </div>
              `}
          <div
            class="stage-option ${!selectedStage ? 'selected' : ''}"
            @click=${this.clearStockInfoStage}
          >
            Use simple stocks (configured below)
          </div>
        </div>
      </div>
    `;
  }

  private renderSimpleStockConfiguration() {
    if (!this.stage) return nothing;

    const addStock = () => {
      if (!this.stage) return;

      this.experimentEditor.updateStage({
        ...this.stage,
        stockOptions: [
          ...this.stage.stockOptions,
          createStock({name: 'Untitled stock'}),
        ],
      });
    };

    return html`
      <div class="section">
        <div class="title">Simple Stock Configuration</div>
        <p class="info-text">
          Configure basic information for stocks. To display charts, create a
          StockInfo stage preceding this stage and select it above.
        </p>

        <div class="stock-list">
          ${this.stage.stockOptions.map((stock, index) =>
            this.renderSimpleStockEditor(stock, index),
          )}
          <pr-button @click=${addStock}> Add new stock </pr-button>
        </div>
      </div>
    `;
  }

  private renderSimpleStockEditor(stock: Stock, index: number) {
    if (!this.stage) return;

    const updateStock = (updates: Partial<Stock>) => {
      if (!this.stage || !this.experimentEditor.canEditStages) return;

      const updatedStock = {...stock, ...updates};

      const stockOptions = [
        ...this.stage.stockOptions.slice(0, index),
        updatedStock,
        ...this.stage.stockOptions.slice(index + 1),
      ];
      this.experimentEditor.updateStage({
        ...this.stage,
        stockOptions,
      });
    };

    const removeStock = () => {
      if (!this.stage) return;

      this.experimentEditor.updateStage({
        ...this.stage,
        stockOptions: [
          ...this.stage.stockOptions.slice(0, index),
          ...this.stage.stockOptions.slice(index + 1),
        ],
      });
    };

    return html`
      <div class="stock-config">
        <div class="simple-stock-editor">
          <md-outlined-text-field
            label="Stock Name"
            value=${stock.name}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${(e: Event) => {
              const name = (e.target as HTMLInputElement).value;
              updateStock({name});
            }}
          ></md-outlined-text-field>

          <md-outlined-text-field
            label="Description (optional)"
            value=${stock.description}
            type="textarea"
            rows="3"
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${(e: Event) => {
              const description = (e.target as HTMLInputElement).value;
              updateStock({description});
            }}
          ></md-outlined-text-field>
        </div>
        <pr-icon-button
          icon="close"
          color="neutral"
          variant="default"
          @click=${removeStock}
        >
        </pr-icon-button>
      </div>
    `;
  }

  private getAvailableStockInfoStages(): StockInfoStageConfig[] {
    // Get all StockInfo stages that precede this stage
    const currentStageIndex = this.experimentEditor.stages.findIndex(
      (stage) => stage.id === this.stage?.id,
    );

    return this.experimentEditor.stages
      .slice(0, currentStageIndex)
      .filter(
        (stage): stage is StockInfoStageConfig =>
          stage.kind === StageKind.STOCKINFO,
      );
  }

  private clearStockInfoStage() {
    if (!this.stage || !this.experimentEditor.canEditStages) return;

    this.experimentEditor.updateStage({
      ...this.stage,
      stockInfoStageId: '',
      stockOptions: [],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'asset-allocation-editor': AssetAllocationEditor;
    'multi-asset-allocation-editor': MultiAssetAllocationEditor;
  }
}
