import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/slider/slider.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {MdDialog} from '@material/web/dialog/dialog';
import {MdSlider} from '@material/web/slider/slider';

import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
  StageKind,
  Stock,
  StockInfoStageConfig,
  generateSVGChart,
  generateDonutChartSVG,
  getStockTicker,
} from '@deliberation-lab/utils';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {ExperimentService} from '../../services/experiment.service';
import {convertMarkdownToHTML} from '../../shared/utils';

import {styles} from './asset_allocation_participant_view.scss';

/** AssetAllocation stage participant view */
@customElement('asset-allocation-participant-view')
export class AssetAllocationParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly experimentService = core.getService(ExperimentService);

  @property({type: Object}) stage: AssetAllocationStageConfig | undefined =
    undefined;

  @state() private selectedStockIndex = 0; // 0 for Stock A, 1 for Stock B
  @state() private allocation = {stockAPercentage: 50, stockBPercentage: 50};
  @state() private stocks = {
    stockA: null as Stock | null,
    stockB: null as Stock | null,
  };

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    // Initialize stocks if needed
    if (!this.stocks.stockA && !this.stocks.stockB) {
      const stockInfoStage = this.getStockInfoStage();
      if (stockInfoStage && stockInfoStage.stocks.length >= 2) {
        this.stocks = {
          stockA: stockInfoStage.stocks[0],
          stockB: stockInfoStage.stocks[1],
        };
      } else if (this.stage.simpleStockConfig) {
        // Create Stock objects from SimpleStock data
        this.stocks = {
          stockA: {
            id: this.stage.simpleStockConfig.stockA.id,
            title: this.stage.simpleStockConfig.stockA.name,
            description: this.stage.simpleStockConfig.stockA.description,
            csvData: '',
            parsedData: [],
            customCards: [],
          },
          stockB: {
            id: this.stage.simpleStockConfig.stockB.id,
            title: this.stage.simpleStockConfig.stockB.name,
            description: this.stage.simpleStockConfig.stockB.description,
            csvData: '',
            parsedData: [],
            customCards: [],
          },
        };
      }
    }

    const answer =
      this.participantAnswerService.getAssetAllocationParticipantAnswer(
        this.stage.id,
      );
    // Ensure allocation is synced with answer allocation
    if (!answer.confirmed) {
      this.allocation = {...answer.allocation};
    }
    const stockInfoStage = this.getStockInfoStage();
    const stocks = this.getStocks(stockInfoStage);

    return html`
      <div class="stage-container">
        <stage-description .stage=${this.stage}></stage-description>

        <div class="allocation-content">
          <!-- Left: Donut Chart and Sliders Combined -->
          <div class="allocation-section">
            <div class="allocation-header">
              <h3>Asset Allocation</h3>
              <md-filled-button
                @click=${() => this.confirmAllocation()}
                ?disabled=${answer.confirmed}
              >
                Confirm Allocation
              </md-filled-button>
            </div>
            <div class="chart-section">
              ${this.renderDonutChart(this.allocation)}
            </div>
            <div class="sliders-section">${this.renderSliders(answer)}</div>
          </div>

          <!-- Right: Stock Info -->
          <div class="info-section">
            <h3>Stock Information</h3>
            ${stocks.length > 0
              ? this.renderStockInfo(stocks, stockInfoStage)
              : this.renderSimpleStockInfo()}
          </div>
        </div>

        <stage-footer .stage=${this.stage} .disabled=${!answer.confirmed}>
          ${answer.confirmed
            ? html`<progress-stage-completed></progress-stage-completed>`
            : nothing}
        </stage-footer>
      </div>

      ${this.renderConfirmationDialog()}
    `;
  }

  private renderDonutChart(allocation: {
    stockAPercentage: number;
    stockBPercentage: number;
  }) {
    if (!this.stocks.stockA || !this.stocks.stockB) return nothing;

    const stockNames = {
      stockA: this.stocks.stockA.title,
      stockB: this.stocks.stockB.title,
    };
    const stockTickers = {
      stockA: getStockTicker(this.stocks.stockA.title),
      stockB: getStockTicker(this.stocks.stockB.title),
    };

    const svgContent = generateDonutChartSVG(
      allocation,
      stockNames,
      stockTickers,
    );
    return unsafeHTML(svgContent);
  }

  private renderSliders(answer: AssetAllocationStageParticipantAnswer) {
    const isConfirmed = answer.confirmed;

    return html`
      <div class="slider-container">
        <div class="slider-group">
          <label for="stock-a-slider">
            <span class="legend-color stock-a"></span>
            <span class="stock-name">${this.stocks.stockA?.title}</span>
            <span class="percentage-display"
              >${this.allocation.stockAPercentage}%</span
            >
          </label>
          <md-slider
            id="stock-a-slider"
            min="0"
            max="100"
            step="5"
            value="${this.allocation.stockAPercentage}"
            labeled
            ticks
            ?disabled=${isConfirmed}
            @input=${(e: Event) => this.handleSliderChange(e, 'A')}
          ></md-slider>
        </div>

        <div class="slider-group">
          <label for="stock-b-slider">
            <span class="legend-color stock-b"></span>
            <span class="stock-name">${this.stocks.stockB?.title}</span>
            <span class="percentage-display"
              >${this.allocation.stockBPercentage}%</span
            >
          </label>
          <md-slider
            id="stock-b-slider"
            min="0"
            max="100"
            step="5"
            value="${this.allocation.stockBPercentage}"
            labeled
            ticks
            ?disabled=${isConfirmed}
            @input=${(e: Event) => this.handleSliderChange(e, 'B')}
          ></md-slider>
        </div>
      </div>
    `;
  }

  private renderStockInfo(
    stocks: Stock[],
    stockInfoStage: StockInfoStageConfig | null,
  ) {
    if (stocks.length === 0) return nothing;

    const selectedStock = stocks[this.selectedStockIndex];
    const chartSvg =
      selectedStock.parsedData.length > 0
        ? generateSVGChart(selectedStock.parsedData, {
            isInvestmentGrowth: stockInfoStage?.showInvestmentGrowth ?? false,
            useQuarterlyMarkers: stockInfoStage?.useQuarterlyMarkers ?? false,
          })
        : '';

    return html`
      <div class="stock-info-container">
        <div class="stock-toggle">
          ${this.selectedStockIndex === 0
            ? html`<md-filled-button
                @click=${() => (this.selectedStockIndex = 0)}
              >
                ${this.stocks.stockA?.title}
              </md-filled-button>`
            : html`<md-outlined-button
                @click=${() => (this.selectedStockIndex = 0)}
              >
                ${this.stocks.stockA?.title}
              </md-outlined-button>`}
          ${this.selectedStockIndex === 1
            ? html`<md-filled-button
                @click=${() => (this.selectedStockIndex = 1)}
              >
                ${this.stocks.stockB?.title}
              </md-filled-button>`
            : html`<md-outlined-button
                @click=${() => (this.selectedStockIndex = 1)}
              >
                ${this.stocks.stockB?.title}
              </md-outlined-button>`}
        </div>

        <div class="stock-content">
          <div class="stock-chart">
            ${chartSvg
              ? html`<div class="chart-wrapper">${unsafeHTML(chartSvg)}</div>`
              : nothing}
          </div>

          <div class="stock-description">
            <h4>${selectedStock.title}</h4>
            <div>
              ${unsafeHTML(convertMarkdownToHTML(selectedStock.description))}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSimpleStockInfo() {
    if (!this.stage?.simpleStockConfig) return nothing;

    const stockA = this.stage.simpleStockConfig.stockA;
    const stockB = this.stage.simpleStockConfig.stockB;
    const selectedStock = this.selectedStockIndex === 0 ? stockA : stockB;

    return html`
      <div class="stock-info-container">
        <div class="stock-toggle">
          ${this.selectedStockIndex === 0
            ? html`<md-filled-button
                @click=${() => (this.selectedStockIndex = 0)}
              >
                ${this.stocks.stockA?.title}
              </md-filled-button>`
            : html`<md-outlined-button
                @click=${() => (this.selectedStockIndex = 0)}
              >
                ${this.stocks.stockA?.title}
              </md-outlined-button>`}
          ${this.selectedStockIndex === 1
            ? html`<md-filled-button
                @click=${() => (this.selectedStockIndex = 1)}
              >
                ${this.stocks.stockB?.title}
              </md-filled-button>`
            : html`<md-outlined-button
                @click=${() => (this.selectedStockIndex = 1)}
              >
                ${this.stocks.stockB?.title}
              </md-outlined-button>`}
        </div>

        <div class="stock-content">
          <div class="stock-description simple">
            <h4>${selectedStock.name}</h4>
            ${selectedStock.description
              ? html`<div>
                  ${unsafeHTML(
                    convertMarkdownToHTML(selectedStock.description),
                  )}
                </div>`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderConfirmationDialog() {
    return html`
      <md-dialog id="confirmation-dialog">
        <div slot="headline">Confirm Your Allocation</div>
        <div slot="content">
          <p>You have allocated:</p>
          <ul>
            <li>
              ${this.stocks.stockA?.title}: ${this.allocation.stockAPercentage}%
            </li>
            <li>
              ${this.stocks.stockB?.title}: ${this.allocation.stockBPercentage}%
            </li>
          </ul>
          <p>Are you sure you want to confirm this allocation?</p>
        </div>
        <div slot="actions">
          <md-text-button @click=${() => this.closeDialog()}>
            Go Back
          </md-text-button>
          <md-filled-button @click=${() => this.saveAllocation()}>
            Confirm
          </md-filled-button>
        </div>
      </md-dialog>
    `;
  }

  private handleSliderChange(event: Event, stock: 'A' | 'B') {
    const slider = event.target as MdSlider;
    const value = slider.value ?? 50;

    if (stock === 'A') {
      this.allocation = {
        stockAPercentage: value,
        stockBPercentage: 100 - value,
      };
    } else {
      this.allocation = {
        stockAPercentage: 100 - value,
        stockBPercentage: value,
      };
    }

    // Update both sliders to reflect the change
    const stockASlider = this.shadowRoot?.getElementById(
      'stock-a-slider',
    ) as MdSlider;
    const stockBSlider = this.shadowRoot?.getElementById(
      'stock-b-slider',
    ) as MdSlider;

    if (stockASlider) stockASlider.value = this.allocation.stockAPercentage;
    if (stockBSlider) stockBSlider.value = this.allocation.stockBPercentage;

    // Update the answer but don't save to Firebase yet
    if (this.stage) {
      const answer =
        this.participantAnswerService.getAssetAllocationParticipantAnswer(
          this.stage.id,
        );
      answer.allocation = {...this.allocation};
    }
    this.requestUpdate();
  }

  private confirmAllocation() {
    const dialog = this.shadowRoot?.getElementById(
      'confirmation-dialog',
    ) as MdDialog;
    dialog?.show();
  }

  private closeDialog() {
    const dialog = this.shadowRoot?.getElementById(
      'confirmation-dialog',
    ) as MdDialog;
    dialog?.close();
  }

  private async saveAllocation() {
    if (!this.stage) return;

    // Close dialog immediately
    this.closeDialog();

    // Update local answer
    this.participantAnswerService.updateAssetAllocation(
      this.stage.id,
      {...this.allocation},
      true,
    );

    // Save to Firebase
    await this.participantAnswerService.saveAssetAllocationAnswer(
      this.stage.id,
    );

    this.requestUpdate();
  }

  private getStockInfoStage(): StockInfoStageConfig | null {
    const stage = this.experimentService.getStage(
      this.stage?.stockInfoStageConfig?.id ?? '',
    );
    if (stage?.kind !== StageKind.STOCKINFO) return null;
    return stage;
  }

  private getStocks(stockInfoStage: StockInfoStageConfig | null): Stock[] {
    if (!stockInfoStage) return [];
    return stockInfoStage.stocks || [];
  }
}
