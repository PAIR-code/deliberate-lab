import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import '@material/web/button/filled-button.js';
import '@material/web/button/filled-tonal-button.js';
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
  AssetAllocation,
  MultiAssetAllocationStageConfig,
  MultiAssetAllocationStageParticipantAnswer,
  StageKind,
  Stock,
  StockAllocation,
  StockInfoStageConfig,
  generateSVGChart,
  generateDonutChartSVG,
  getStockTicker,
  createAssetAllocation,
  createAssetAllocationStageParticipantAnswer,
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

  private get stocks() {
    if (!this.stage) {
      return {stockA: null, stockB: null};
    }
    return {
      stockA: this.stage.stockConfig.stockA,
      stockB: this.stage.stockConfig.stockB,
    };
  }

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    let answer =
      this.participantAnswerService.getAssetAllocationParticipantAnswer(
        this.stage.id,
      );

    // Initialize answer if it doesn't exist
    if (!answer) {
      answer = this.createInitialAnswer();
      this.participantAnswerService.addAnswer(this.stage.id, answer);
    }

    // Sync state with answer allocation percentages
    this.allocation.stockAPercentage = answer.allocation.stockA.percentage;
    this.allocation.stockBPercentage = answer.allocation.stockB.percentage;

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
              ${this.renderDonutChart(answer.allocation)}
            </div>
            <div class="sliders-section">${this.renderSliders(answer)}</div>
          </div>

          <!-- Right: Stock Info -->
          <div class="info-section">
            <h3>Stock Information</h3>
            ${this.renderStockInfo()}
          </div>
        </div>

        <stage-footer .stage=${this.stage} .disabled=${!answer.confirmed}>
          ${answer.confirmed && this.stage.progress.showParticipantProgress
            ? html`<progress-stage-completed></progress-stage-completed>`
            : nothing}
        </stage-footer>
      </div>

      ${this.renderConfirmationDialog()}
    `;
  }

  private renderDonutChart(allocation: AssetAllocation) {
    if (!this.stocks.stockA || !this.stocks.stockB) return nothing;

    const stockTickers = {
      stockA: getStockTicker(this.stocks.stockA.name),
      stockB: getStockTicker(this.stocks.stockB.name),
    };
    const svgContent = generateDonutChartSVG(allocation, stockTickers);
    return unsafeHTML(svgContent);
  }

  private renderSliders(answer: AssetAllocationStageParticipantAnswer) {
    const isConfirmed = answer.confirmed;

    return html`
      <div class="slider-container">
        <div class="slider-group">
          <label for="stock-a-slider">
            <span class="legend-color stock-a"></span>
            <span class="stock-name">${this.stocks.stockA?.name}</span>
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
            <span class="stock-name">${this.stocks.stockB?.name}</span>
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

  private renderStockInfo() {
    if (!this.stocks.stockA || !this.stocks.stockB) return nothing;

    const selectedStock =
      this.selectedStockIndex === 0 ? this.stocks.stockA : this.stocks.stockB;

    // Get the stockInfoStage only if referenced
    const stockInfoStage = this.stage?.stockConfig.stockInfoStageId
      ? this.getStockInfoStage()
      : null;
    const chartSvg = stockInfoStage
      ? generateSVGChart(selectedStock.parsedData, {
          isInvestmentGrowth: stockInfoStage.showInvestmentGrowth,
          useQuarterlyMarkers: stockInfoStage.useQuarterlyMarkers,
        })
      : '';

    return html`
      <div class="stock-info-container">
        <div class="stock-toggle">
          ${this.selectedStockIndex === 0
            ? html`<md-filled-tonal-button
                @click=${() => (this.selectedStockIndex = 0)}
              >
                ${this.stocks.stockA.name}
              </md-filled-tonal-button>`
            : html`<md-outlined-button
                @click=${() => (this.selectedStockIndex = 0)}
              >
                ${this.stocks.stockA.name}
              </md-outlined-button>`}
          ${this.selectedStockIndex === 1
            ? html`<md-filled-tonal-button
                @click=${() => (this.selectedStockIndex = 1)}
              >
                ${this.stocks.stockB.name}
              </md-filled-tonal-button>`
            : html`<md-outlined-button
                @click=${() => (this.selectedStockIndex = 1)}
              >
                ${this.stocks.stockB.name}
              </md-outlined-button>`}
        </div>

        <div class="stock-content">
          ${chartSvg
            ? html`<div class="stock-chart">
                <div class="chart-wrapper">${unsafeHTML(chartSvg)}</div>
              </div>`
            : nothing}

          <div class="stock-description ${chartSvg ? '' : 'simple'}">
            <h4>${selectedStock.name}</h4>
            <div>
              ${unsafeHTML(convertMarkdownToHTML(selectedStock.description))}
            </div>
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
              ${this.stocks.stockA?.name}: ${this.allocation.stockAPercentage}%
            </li>
            <li>
              ${this.stocks.stockB?.name}: ${this.allocation.stockBPercentage}%
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
      answer!.allocation = createAssetAllocation(
        this.stocks.stockA!,
        this.stocks.stockB!,
        this.allocation.stockAPercentage,
        this.allocation.stockBPercentage,
      );
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
    if (!this.stage || !this.stocks.stockA || !this.stocks.stockB) return;

    // Close dialog immediately
    this.closeDialog();

    // Create allocation with the new structure
    const allocation = createAssetAllocation(
      this.stocks.stockA,
      this.stocks.stockB,
      this.allocation.stockAPercentage,
      this.allocation.stockBPercentage,
    );

    // Update local answer
    this.participantAnswerService.updateAssetAllocation(
      this.stage.id,
      allocation,
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
      this.stage?.stockConfig.stockInfoStageId ?? '',
    );
    if (stage?.kind !== StageKind.STOCKINFO) return null;
    return stage;
  }

  private createInitialAnswer(): AssetAllocationStageParticipantAnswer {
    const allocation = createAssetAllocation(
      this.stocks.stockA!,
      this.stocks.stockB!,
    );
    return createAssetAllocationStageParticipantAnswer({
      id: this.stage!.id,
      allocation,
    });
  }
}

/** MultiAssetAllocation stage participant view */
@customElement('multi-asset-allocation-participant-view')
export class MultiAssetAllocationParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly experimentService = core.getService(ExperimentService);

  @property({type: Object}) stage: MultiAssetAllocationStageConfig | undefined =
    undefined;

  override render() {
    if (!this.stage) return nothing;

    // Check if allocations sum to 100 percent
    const isValidAnswer =
      this.stage.stockOptions
        .map(
          (stock, index) => this.getStockAllocation(stock.id)?.percentage ?? 0,
        )
        .reduce((acc, percentage) => acc + percentage, 0) === 100;

    const renderError = () => {
      return html`
        <div class="error-message">
          Your allocations must add up to exactly 100% before you can move on.
        </div>
      `;
    };

    const saveAnswers = async () => {
      if (!this.stage) return;

      // Save all answers for this stage
      await this.participantAnswerService.saveMultiAssetAllocationAnswer(
        this.stage.id,
      );
      await this.participantService.progressToNextStage();
    };

    return html`
      <div class="stage-container">
        <stage-description .stage=${this.stage}></stage-description>

        <div class="allocation-content">
          <div class="allocation-section">
            <div class="allocation-header">
              <h3>Asset Allocation</h3>
            </div>
            <div class="sliders-section">
              ${this.stage.stockOptions.map((stock, index) =>
                this.renderSlider(
                  stock,
                  this.getStockAllocation(stock.id),
                  index,
                ),
              )}
              ${!isValidAnswer ? renderError() : nothing}
            </div>
          </div>
        </div>

        <stage-footer
          .stage=${this.stage}
          .disabled=${!isValidAnswer}
          .onNextClick=${saveAnswers}
        >
          ${this.stage?.progress.showParticipantProgress
            ? html`<progress-stage-completed></progress-stage-completed>`
            : nothing}
        </stage-footer>
      </div>
    `;
  }

  private getStockAllocation(stockId: string) {
    const answer =
      this.participantAnswerService.answerMap[this.stage?.id ?? ''];
    if (answer?.kind !== StageKind.MULTI_ASSET_ALLOCATION) {
      return undefined;
    }
    return answer.allocationMap[stockId];
  }

  private renderSlider(
    stock: Stock,
    allocation: StockAllocation | undefined,
    index: number,
  ) {
    const updateAllocation = (e: Event) => {
      if (!this.stage) return;

      const percentage = Number((e.target as HTMLInputElement).value);
      this.participantAnswerService.updateStockAllocation(this.stage.id, {
        ...stock,
        percentage,
      });
    };

    const id = `${stock.id}-slider`;
    const isDisabled = this.participantService.disableStage;

    return html`
      <div class="slider-group">
        <label for=${id}>
          <span class="legend-color stock-${index % 9}"></span>
          <span class="stock-name">${stock.name}</span>
          <span class="percentage-display"
            >${allocation?.percentage ?? 0}%</span
          >
        </label>
        <md-slider
          id=${id}
          min="0"
          max="100"
          step="5"
          value="${allocation?.percentage ?? 0}"
          labeled
          ticks
          ?disabled=${isDisabled}
          @input=${updateAllocation}
        ></md-slider>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'asset-allocation-participant-view': AssetAllocationParticipantView;
    'multi-asset-allocation-participant-view': MultiAssetAllocationParticipantView;
  }
}
