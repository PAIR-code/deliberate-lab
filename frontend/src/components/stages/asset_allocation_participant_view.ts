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
  StageKind,
  StockInfoStageConfig,
  generateSVGChart,
  generateDonutChartSVG,
  getStockTicker,
  createAssetAllocation,
  createAssetAllocationStageParticipantAnswer,
  Stock,
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

  @state() private selectedStockIndex = 0;

  @state() private allStocks: Stock[] = [];

  override connectedCallback() {
    super.connectedCallback();
    this.initializeStocks();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('stage')) {
      this.initializeStocks();
    }
  }

  private initializeStocks() {
    if (!this.stage) {
      this.allStocks = [];
      return;
    }
    this.allStocks = [
      this.stage.stockConfig.stockA,
      this.stage.stockConfig.stockB,
      ...(this.stage.stockConfig.additionalStocks || []),
    ];
  }

  private getAnswer(): AssetAllocationStageParticipantAnswer | undefined {
    if (!this.stage) return undefined;
    const answer =
      this.participantAnswerService.getAssetAllocationParticipantAnswer(
        this.stage.id,
      );
    return answer ?? undefined;
  }

  override render() {
    if (
      !this.stage ||
      !this.participantService.profile ||
      !this.allStocks.length
    ) {
      return nothing;
    }

    let answer = this.getAnswer();

    if (!answer) {
      answer = this.createInitialAnswer();
      this.participantAnswerService.addAnswer(this.stage.id, answer);
    }

    const allAllocations = [
      answer.allocation.stockA,
      answer.allocation.stockB,
      ...(answer.allocation.additionalAllocations || []),
    ];
    const totalPercentage = Math.round(
      allAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0),
    );

    return html`
      <div class="stage-container">
        <stage-description .stage=${this.stage}></stage-description>

        <div class="allocation-content">
          <div class="allocation-section">
            <div class="allocation-header">
              <h3>
                Asset Allocation
                <span
                  class="total-percentage ${totalPercentage !== 100
                    ? 'invalid'
                    : ''}"
                >
                  (Total: ${totalPercentage}%)
                </span>
              </h3>
              <md-filled-button
                @click=${() => this.confirmAllocation()}
                ?disabled=${answer.confirmed || totalPercentage !== 100}
              >
                Confirm Allocation
              </md-filled-button>
            </div>
            <div class="chart-section">
              ${this.renderDonutChart(answer.allocation)}
            </div>
            <div class="sliders-section">${this.renderSliders(answer)}</div>
          </div>

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

      ${this.renderConfirmationDialog(answer.allocation)}
    `;
  }

  private renderDonutChart(allocation: AssetAllocation) {
    const svgContent = generateDonutChartSVG(allocation);
    return unsafeHTML(svgContent);
  }

  private renderSliders(answer: AssetAllocationStageParticipantAnswer) {
    const isConfirmed = answer.confirmed;
    const allAllocations = [
      answer.allocation.stockA,
      answer.allocation.stockB,
      ...(answer.allocation.additionalAllocations || []),
    ];

    return html`
      <div class="slider-container">
        ${allAllocations.map(
          (alloc, index) => html`
            <div class="slider-group">
              <label for="stock-${index}-slider">
                <span class="legend-color stock-${index % 10}"></span>
                <span class="stock-name">${this.allStocks[index].name}</span>
                <span class="percentage-display"
                  >${Math.round(alloc.percentage)}%</span
                >
              </label>
              <md-slider
                id="stock-${index}-slider"
                min="0"
                max="100"
                step="1"
                .value=${alloc.percentage}
                labeled
                ?disabled=${isConfirmed}
                @input=${(e: Event) => this.handleSliderChange(e, index)}
              ></md-slider>
            </div>
          `,
        )}
      </div>
    `;
  }

  private renderStockInfo() {
    if (!this.allStocks.length) return nothing;

    const selectedStock = this.allStocks[this.selectedStockIndex];
    if (!selectedStock) return nothing;

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
          ${this.allStocks.map(
            (stock, index) => html`
              ${this.selectedStockIndex === index
                ? html`<md-filled-tonal-button
                    >${stock.name}</md-filled-tonal-button
                  >`
                : html`<md-outlined-button
                    @click=${() => (this.selectedStockIndex = index)}
                  >
                    ${stock.name}
                  </md-outlined-button>`}
            `,
          )}
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

  private renderConfirmationDialog(allocation: AssetAllocation) {
    const allAllocations = [
      allocation.stockA,
      allocation.stockB,
      ...(allocation.additionalAllocations || []),
    ];

    return html`
      <md-dialog id="confirmation-dialog">
        <div slot="headline">Confirm Your Allocation</div>
        <div slot="content">
          <p>You have allocated:</p>
          <ul>
            ${allAllocations.map(
              (alloc) => html`
                <li>${alloc.name}: ${Math.round(alloc.percentage)}%</li>
              `,
            )}
          </ul>
          <p>Are you sure you want to confirm this allocation?</p>
        </div>
        <div slot="actions">
          <md-text-button @click=${() => this.closeDialog()}
            >Go Back</md-text-button
          >
          <md-filled-button @click=${() => this.saveAllocation()}
            >Confirm</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  /**
   * ✨ CORRECTED AND RESTORED
   * This function now correctly updates the central MobX state and contains
   * the interactive logic to adjust other sliders to maintain a 100% sum.
   */
  private handleSliderChange(event: Event, changedIndex: number) {
    if (!this.stage) return;
    const answer = this.getAnswer();
    if (!answer) return;

    const slider = event.target as MdSlider;
    const newValue = slider.value ?? 0;

    const allCurrentAllocations = [
      answer.allocation.stockA,
      answer.allocation.stockB,
      ...(answer.allocation.additionalAllocations || []),
    ];
    const percentages = allCurrentAllocations.map((a) => a.percentage);

    const oldValue = percentages[changedIndex];
    const diff = newValue - oldValue;
    if (Math.abs(diff) < 0.01) return; // Ignore tiny floating point changes

    percentages[changedIndex] = newValue;

    // Distribute the difference among all other sliders proportionally
    const totalOfOthers = 100 - oldValue;
    if (totalOfOthers > 0) {
      for (let i = 0; i < percentages.length; i++) {
        if (i !== changedIndex) {
          const proportion = percentages[i] / totalOfOthers;
          percentages[i] -= diff * proportion;
        }
      }
    }

    // Clamp and re-normalize to fix any floating point inaccuracies and ensure the sum is exactly 100
    const clamped = percentages.map((p) => Math.max(0, Math.min(100, p)));
    const total = clamped.reduce((sum, p) => sum + p, 0);
    const normalizedPercentages = clamped.map((p) => (p / total) * 100);

    const finalAllocation = createAssetAllocation(
      this.allStocks,
      normalizedPercentages,
    );

    // This is the crucial step: update the answer in the MobX service.
    // The component will automatically re-render with the new data.
    this.participantAnswerService.updateAssetAllocation(
      this.stage.id,
      finalAllocation,
      false, // not confirmed yet
    );
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
    const answer = this.getAnswer();
    if (!answer) return;

    this.closeDialog();

    this.participantAnswerService.updateAssetAllocation(
      this.stage.id,
      answer.allocation,
      true, // confirmed
    );

    await this.participantAnswerService.saveAssetAllocationAnswer(
      this.stage.id,
    );
  }

  private getStockInfoStage(): StockInfoStageConfig | null {
    const stage = this.experimentService.getStage(
      this.stage?.stockConfig.stockInfoStageId ?? '',
    );
    if (stage?.kind !== StageKind.STOCKINFO) return null;
    return stage;
  }

  private createInitialAnswer(): AssetAllocationStageParticipantAnswer {
    const allocation = createAssetAllocation(this.allStocks, []);
    return createAssetAllocationStageParticipantAnswer({
      id: this.stage!.id,
      allocation,
    });
  }
}
