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
  getBestAndWorstYearPerformance,
  StockInfoCard,
  generateSVGChart,
} from '@deliberation-lab/utils';
import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {convertMarkdownToHTML} from '../../shared/utils';

import {styles} from './stockinfo_participant_view.scss';

/** StockInfo stage participant view */
@customElement('stockinfo-participant-view')
export class StockInfoParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property({type: Object}) stage: StockInfoStageConfig | undefined = undefined;
  @property({type: Number}) private currentStockIndex = 0;
  @property({type: Array}) private viewedStockIds: string[] = [];

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    const currentStock = this.stage.stocks[this.currentStockIndex];
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

        <stage-footer
          .stage=${this.stage}
          .disabled=${!isComplete}
          .onNextClick=${this.saveAndProgress}
        >
          <progress-stage-completed></progress-stage-completed>
        </stage-footer>
      </div>
    `;
  }

  private renderStockHeader(stock: Stock) {
    return html`
      <div class="stock-header">
        <h2 class="stock-title">${stock.title}</h2>
      </div>
    `;
  }

  private renderInfoCards(stock: Stock) {
    const cards: StockInfoCard[] = [];

    // Add default cards if enabled
    if (this.stage?.showBestYearCard || this.stage?.showWorstYearCard) {
      const performance = getBestAndWorstYearPerformance(stock.parsedData);

      if (this.stage.showBestYearCard && performance.best) {
        cards.push({
          id: 'best-year',
          title: 'Best Year Performance',
          value: `$${Math.abs(performance.best.dollarChange).toFixed(0)}`,
          subtext: `${performance.best.percentChange.toFixed(1)}% (${performance.best.year})`,
          enabled: true,
        });
      }

      if (this.stage.showWorstYearCard && performance.worst) {
        cards.push({
          id: 'worst-year',
          title: 'Worst Year Performance',
          value: `$${Math.abs(performance.worst.dollarChange).toFixed(0)}`,
          subtext: `${performance.worst.percentChange.toFixed(1)}% (${performance.worst.year})`,
          enabled: true,
        });
      }
    }

    // Add custom cards
    cards.push(...stock.customCards.filter((card) => card.enabled));

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
    return html`
      <div class="main-content">
        <div class="chart-container">
          <h3>
            ${this.stage?.showInvestmentGrowth
              ? '$1,000 Investment Growth'
              : 'Price Chart'}
          </h3>
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
    });

    return html`<div class="chart">${unsafeHTML(svgContent)}</div>`;
  }

  private renderStockNavigation() {
    if (this.stage!.stocks.length <= 1) {
      return nothing;
    }

    return html`
      <div class="stock-navigation">
        ${this.stage!.stocks.map((stock, index) => {
          const isActive = index === this.currentStockIndex;
          return isActive
            ? html`
                <md-filled-button
                  class="stock-nav-button active"
                  @click=${() => this.switchToStock(index)}
                >
                  ${stock.title || `Stock ${index + 1}`}
                </md-filled-button>
              `
            : html`
                <md-outlined-button
                  class="stock-nav-button"
                  @click=${() => this.switchToStock(index)}
                >
                  ${stock.title || `Stock ${index + 1}`}
                </md-outlined-button>
              `;
        })}
      </div>
    `;
  }

  private switchToStock(index: number) {
    if (index !== this.currentStockIndex) {
      this.currentStockIndex = index;

      // Record view of new stock
      const stockId = this.stage!.stocks[index].id;
      if (!this.viewedStockIds.includes(stockId)) {
        this.viewedStockIds = [...this.viewedStockIds, stockId];
      }
    }
  }

  private checkStageComplete(): boolean {
    if (!this.stage?.requireViewAllStocks) {
      return true; // If not required, always allow progression
    }

    // Check if all stocks have been viewed
    const allStockIds = this.stage.stocks.map((stock) => stock.id);
    return allStockIds.every((stockId) =>
      this.viewedStockIds.includes(stockId),
    );
  }

  private saveAndProgress = async () => {
    this.participantService.progressToNextStage();
  };

  protected override firstUpdated() {
    // Record initial stock view
    const currentStockId = this.stage?.stocks[0]?.id;

    if (currentStockId && !this.viewedStockIds.includes(currentStockId)) {
      this.viewedStockIds = [currentStockId];
    }
  }
}
