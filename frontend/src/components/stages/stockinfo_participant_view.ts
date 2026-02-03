import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {
  Stock,
  StockInfoStageConfig,
  formatCurrency,
  generateSVGChart,
  generateStockInfoCards,
  parseStockData,
} from '@deliberation-lab/utils';
import {core} from '../../core/core';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {ParticipantService} from '../../services/participant.service';
import {convertMarkdownToHTML} from '../../shared/utils';

import {styles} from './stockinfo_participant_view.scss';

/** StockInfo stage participant view */
@customElement('stockinfo-participant-view')
export class StockInfoParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property({type: Object}) stage: StockInfoStageConfig | undefined = undefined;

  /** Stocks with failsafe parsing and visibleStockIds filtering/ordering */
  private get stocks(): Stock[] {
    const {stage} = this;
    if (!stage) return [];

    // If visibleStockIds is set, use its order (map over IDs to preserve order)
    // Otherwise show all stocks in their original order
    const orderedStocks = stage.visibleStockIds?.length
      ? stage.visibleStockIds
          .map((id) => stage.stocks.find((stock) => stock.id === id))
          .filter((stock): stock is Stock => stock !== undefined)
      : stage.stocks;

    // Failsafe: ensure parsedData exists
    return orderedStocks.map((stock) => ({
      ...stock,
      parsedData: stock.parsedData?.length
        ? stock.parsedData
        : parseStockData(stock.csvData),
    }));
  }

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    const currentStockIndex =
      this.participantAnswerService.getCurrentStockIndex(this.stage.id);
    const currentStock = this.stocks[currentStockIndex];
    if (!currentStock) {
      return nothing;
    }

    const isComplete = this.checkStageComplete();

    return html`
      <div class="stage-container">
        <stage-description .stage=${this.stage}></stage-description>

        <div class="stock-content">
          ${this.renderStockHeader(currentStock)}
          ${this.renderInfoCards(currentStock)}
          ${this.renderMainContent(currentStock)}
        </div>

        ${this.renderStockNavigation()}

        <stage-footer .stage=${this.stage} .disabled=${!isComplete}>
          ${this.stage.progress.showParticipantProgress
            ? html`<progress-stage-completed></progress-stage-completed>`
            : nothing}
        </stage-footer>
      </div>
    `;
  }

  private renderStockHeader(stock: Stock) {
    return html`
      <div class="stock-header">
        <h2 class="stock-title">${stock.name}</h2>
      </div>
    `;
  }

  private renderInfoCards(stock: Stock) {
    const cards = generateStockInfoCards(stock, this.stage!);

    if (cards.length === 0) {
      return nothing;
    }

    return html`
      <div class="info-cards">
        ${cards.map(
          (card) => html`
            <div class="info-card">
              <div class="card-title">${card.title}</div>
              <div class="card-value">${card.value}</div>
              <div class="card-subtext">${card.subtext}</div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private renderMainContent(stock: Stock) {
    const currency = this.stage?.currency ?? 'USD';
    const initialInvestment = this.stage?.initialInvestment ?? 1000;
    const chartTitle = this.stage?.showInvestmentGrowth
      ? `${formatCurrency(initialInvestment, currency)} Investment Growth`
      : 'Price Chart';

    return html`
      <div class="main-content">
        <div class="chart-container">
          <h3>${chartTitle}</h3>
          ${this.renderChart(stock)}
        </div>
        <div class="description-container">
          <h3>Summary</h3>
          <div class="stock-description">
            ${stock.description
              ? unsafeHTML(convertMarkdownToHTML(stock.description))
              : html`<p>No description available.</p>`}
          </div>
        </div>
      </div>
    `;
  }

  private renderChart(stock: Stock) {
    if (stock.parsedData.length === 0) {
      return html`<div class="no-data">No chart data available</div>`;
    }

    const svgContent = generateSVGChart(stock.parsedData, {
      isInvestmentGrowth: this.stage?.showInvestmentGrowth,
      useQuarterlyMarkers: this.stage?.useQuarterlyMarkers,
      initialInvestment: this.stage?.initialInvestment,
      currency: this.stage?.currency,
    });

    return html`<div class="chart">${unsafeHTML(svgContent)}</div>`;
  }

  private renderStockNavigation() {
    if (this.stocks.length <= 1) {
      return nothing;
    }

    const currentStockIndex =
      this.participantAnswerService.getCurrentStockIndex(this.stage!.id);

    return html`
      <div class="stock-navigation">
        ${this.stocks.map((stock, index) => {
          const isActive = index === currentStockIndex;
          return isActive
            ? html`
                <md-filled-button
                  class="stock-nav-button active"
                  @click=${() => this.switchToStock(index)}
                >
                  ${stock.name || `Stock ${index + 1}`}
                </md-filled-button>
              `
            : html`
                <md-outlined-button
                  class="stock-nav-button"
                  @click=${() => this.switchToStock(index)}
                >
                  ${stock.name || `Stock ${index + 1}`}
                </md-outlined-button>
              `;
        })}
      </div>
    `;
  }

  private switchToStock(index: number) {
    const currentStockIndex =
      this.participantAnswerService.getCurrentStockIndex(this.stage!.id);
    if (index !== currentStockIndex) {
      // Update current stock index
      this.participantAnswerService.updateStockInfoAnswer(this.stage!.id, {
        currentStockIndex: index,
      });

      // Record view of new stock
      const stockId = this.stocks[index].id;
      const viewedStockIds = this.participantAnswerService.getViewedStockIds(
        this.stage!.id,
      );
      if (!viewedStockIds.includes(stockId)) {
        const updatedViewedStockIds = [...viewedStockIds, stockId];
        this.participantAnswerService.updateStockInfoAnswer(this.stage!.id, {
          viewedStockIds: updatedViewedStockIds,
        });
      }
    }
  }

  private checkStageComplete(): boolean {
    if (!this.stage?.requireViewAllStocks) {
      return true; // If not required, always allow progression
    }

    // Check if all stocks have been viewed
    const allStockIds = this.stocks.map((stock) => stock.id);
    const viewedStockIds = this.participantAnswerService.getViewedStockIds(
      this.stage.id,
    );
    return allStockIds.every((stockId) => viewedStockIds.includes(stockId));
  }

  protected override firstUpdated() {
    // Record initial stock view
    const currentStockId = this.stocks[0]?.id;

    if (currentStockId) {
      const viewedStockIds = this.participantAnswerService.getViewedStockIds(
        this.stage!.id,
      );
      if (!viewedStockIds.includes(currentStockId)) {
        const updatedViewedStockIds = [...viewedStockIds, currentStockId];
        this.participantAnswerService.updateStockInfoAnswer(this.stage!.id, {
          viewedStockIds: updatedViewedStockIds,
        });
      }
    }
  }
}
