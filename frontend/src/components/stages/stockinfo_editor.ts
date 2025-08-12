import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/textfield/outlined-text-field.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  StockInfoStageConfig,
  Stock,
  StockInfoCard,
  createStock,
  createStockInfoCard,
  parseStockData,
} from '@deliberation-lab/utils';

import {styles} from './stockinfo_editor.scss';

/** StockInfo stage editor for experiment builder. */
@customElement('stockinfo-editor')
export class StockInfoEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: StockInfoStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="section">
        <div class="header">
          <div class="title">StockInfo Settings</div>
        </div>

        ${this.renderSettings()} ${this.renderStocksSection()}
      </div>
    `;
  }

  private renderSettings() {
    if (!this.stage) return nothing;

    return html`
      <div class="settings">
        <div class="setting-row">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${this.stage.showBestYearCard}
              @change=${this.updateShowBestYearCard}
            ></md-checkbox>
            Show best year performance card
          </label>
        </div>

        <div class="setting-row">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${this.stage.showWorstYearCard}
              @change=${this.updateShowWorstYearCard}
            ></md-checkbox>
            Show worst year performance card
          </label>
        </div>

        <div class="setting-row">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${this.stage.requireViewAllStocks}
              @change=${this.updateRequireViewAllStocks}
            ></md-checkbox>
            Require viewing all stocks before proceeding
          </label>
        </div>

        <div class="setting-row">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${this.stage.useQuarterlyMarkers}
              @change=${this.updateUseQuarterlyMarkers}
            ></md-checkbox>
            Use quarterly markers (Q1, Q2, Q3, Q4) instead of monthly markers
          </label>
        </div>

        <div class="setting-row">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${this.stage.showInvestmentGrowth}
              @change=${this.updateShowInvestmentGrowth}
            ></md-checkbox>
            Show $1,000 investment growth instead of stock price
          </label>
        </div>
      </div>
    `;
  }

  private renderStocksSection() {
    if (!this.stage) return nothing;

    return html`
      <div class="stocks-section">
        <div class="header">
          <div class="title">Stocks (${this.stage.stocks.length})</div>
          <md-filled-button @click=${this.addStock}>
            <md-icon slot="icon">add</md-icon>
            Add Stock
          </md-filled-button>
        </div>

        <div class="stocks-list">
          ${this.stage.stocks.map((stock, index) =>
            this.renderStockEditor(stock, index),
          )}
        </div>
      </div>
    `;
  }

  private renderStockEditor(stock: Stock, index: number) {
    return html`
      <div class="stock-editor">
        <div class="stock-header">
          <div class="stock-title-label">Stock ${index + 1}</div>
          <md-icon-button @click=${() => this.removeStock(index)}>
            <md-icon>delete</md-icon>
          </md-icon-button>
        </div>

        <div class="stock-fields">
          <div class="field-row">
            <md-filled-text-field
              label="Stock Title"
              .value=${stock.name}
              @input=${(e: Event) => this.updateStockName(index, e)}
              placeholder="e.g., NexTech Solutions (NXTS)"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></md-filled-text-field>
          </div>

          <div class="field-row">
            <md-outlined-text-field
              type="textarea"
              label="CSV Data"
              supporting-text="Paste CSV data with columns: Date,Close (first row should be headers)"
              .value=${stock.csvData}
              @input=${(e: Event) => this.updateStockCsvData(index, e)}
              placeholder="Date,Close
2020-01-01,100.00
2020-01-02,102.50
..."
              ?disabled=${!this.experimentEditor.canEditStages}
              rows="6"
            ></md-outlined-text-field>
            ${stock.csvData ? this.renderDataPreview(stock) : nothing}
          </div>

          <div class="field-row">
            <md-outlined-text-field
              type="textarea"
              label="Description"
              .value=${stock.description}
              @input=${(e: Event) => this.updateStockDescription(index, e)}
              placeholder="Brief description or summary of the stock..."
              ?disabled=${!this.experimentEditor.canEditStages}
              rows="3"
            ></md-outlined-text-field>
          </div>

          ${this.renderCustomCards(stock, index)}
        </div>
      </div>
    `;
  }

  private renderDataPreview(stock: Stock) {
    if (stock.parsedData.length === 0) {
      return html`
        <div class="data-preview error">
          <md-icon>error</md-icon>
          No valid data parsed. Check CSV format.
        </div>
      `;
    }

    const dataPoints = stock.parsedData.length;
    const firstDate = stock.parsedData[0]?.date;
    const lastDate = stock.parsedData[stock.parsedData.length - 1]?.date;
    const minPrice = Math.min(...stock.parsedData.map((d) => d.close));
    const maxPrice = Math.max(...stock.parsedData.map((d) => d.close));

    return html`
      <div class="data-preview success">
        <md-icon>check_circle</md-icon>
        <div class="preview-content">
          <div><strong>${dataPoints}</strong> data points parsed</div>
          <div>Date range: ${firstDate} to ${lastDate}</div>
          <div>
            Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}
          </div>
        </div>
      </div>
    `;
  }

  private renderCustomCards(stock: Stock, stockIndex: number) {
    return html`
      <div class="custom-cards-section">
        <div class="cards-header">
          <div class="cards-title">Custom Info Cards</div>
          <md-outlined-button @click=${() => this.addCustomCard(stockIndex)}>
            <md-icon slot="icon">add</md-icon>
            Add Card
          </md-outlined-button>
        </div>

        <div class="custom-cards-list">
          ${stock.customCards.map((card, cardIndex) =>
            this.renderCustomCardEditor(card, stockIndex, cardIndex),
          )}
        </div>
      </div>
    `;
  }

  private renderCustomCardEditor(
    card: StockInfoCard,
    stockIndex: number,
    cardIndex: number,
  ) {
    return html`
      <div class="custom-card-editor">
        <div class="card-header">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${card.enabled}
              @change=${(e: Event) =>
                this.updateCustomCardEnabled(stockIndex, cardIndex, e)}
            ></md-checkbox>
            Custom Card ${cardIndex + 1}
          </label>
          <md-icon-button
            @click=${() => this.removeCustomCard(stockIndex, cardIndex)}
          >
            <md-icon>delete</md-icon>
          </md-icon-button>
        </div>

        <div class="card-fields">
          <div class="field-row">
            <md-filled-text-field
              label="Title"
              .value=${card.title}
              @input=${(e: Event) =>
                this.updateCustomCardTitle(stockIndex, cardIndex, e)}
              placeholder="e.g., Market Cap"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></md-filled-text-field>
          </div>

          <div class="field-row">
            <md-filled-text-field
              label="Value"
              .value=${card.value}
              @input=${(e: Event) =>
                this.updateCustomCardValue(stockIndex, cardIndex, e)}
              placeholder="e.g., $2.5T"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></md-filled-text-field>
          </div>

          <div class="field-row">
            <md-filled-text-field
              label="Subtext"
              .value=${card.subtext}
              @input=${(e: Event) =>
                this.updateCustomCardSubtext(stockIndex, cardIndex, e)}
              placeholder="e.g., As of Dec 2023"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></md-filled-text-field>
          </div>
        </div>
      </div>
    `;
  }

  // Event handlers

  private updateShowBestYearCard = (e: Event) => {
    if (!this.stage) return;
    const checked = (e.target as HTMLInputElement).checked;
    this.experimentEditor.updateStage({
      ...this.stage,
      showBestYearCard: checked,
    });
  };

  private updateShowWorstYearCard = (e: Event) => {
    if (!this.stage) return;
    const checked = (e.target as HTMLInputElement).checked;
    this.experimentEditor.updateStage({
      ...this.stage,
      showWorstYearCard: checked,
    });
  };

  private updateRequireViewAllStocks = (e: Event) => {
    if (!this.stage) return;
    const checked = (e.target as HTMLInputElement).checked;
    this.experimentEditor.updateStage({
      ...this.stage,
      requireViewAllStocks: checked,
    });
  };

  private updateUseQuarterlyMarkers = (e: Event) => {
    if (!this.stage) return;
    const checked = (e.target as HTMLInputElement).checked;
    this.experimentEditor.updateStage({
      ...this.stage,
      useQuarterlyMarkers: checked,
    });
  };

  private updateShowInvestmentGrowth = (e: Event) => {
    if (!this.stage) return;
    const checked = (e.target as HTMLInputElement).checked;
    this.experimentEditor.updateStage({
      ...this.stage,
      showInvestmentGrowth: checked,
    });
  };

  private addStock = () => {
    if (!this.stage) return;
    const newStock = createStock();
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks: [...this.stage.stocks, newStock],
    });
  };

  private removeStock = (index: number) => {
    if (!this.stage) return;
    const stocks = [...this.stage.stocks];
    stocks.splice(index, 1);
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateStockName = (index: number, e: Event) => {
    if (!this.stage) return;
    const value = (e.target as HTMLInputElement).value;
    const stocks = [...this.stage.stocks];
    stocks[index] = {...stocks[index], name: value};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateStockCsvData = (index: number, e: Event) => {
    if (!this.stage) return;
    const value = (e.target as HTMLTextAreaElement).value;
    const stocks = [...this.stage.stocks];
    const parsedData = parseStockData(value);
    stocks[index] = {
      ...stocks[index],
      csvData: value,
      parsedData,
    };
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateStockDescription = (index: number, e: Event) => {
    if (!this.stage) return;
    const value = (e.target as HTMLTextAreaElement).value;
    const stocks = [...this.stage.stocks];
    stocks[index] = {...stocks[index], description: value};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private addCustomCard = (stockIndex: number) => {
    if (!this.stage) return;
    const stocks = [...this.stage.stocks];
    const newCard = createStockInfoCard();
    stocks[stockIndex] = {
      ...stocks[stockIndex],
      customCards: [...stocks[stockIndex].customCards, newCard],
    };
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private removeCustomCard = (stockIndex: number, cardIndex: number) => {
    if (!this.stage) return;
    const stocks = [...this.stage.stocks];
    const customCards = [...stocks[stockIndex].customCards];
    customCards.splice(cardIndex, 1);
    stocks[stockIndex] = {...stocks[stockIndex], customCards};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateCustomCardEnabled = (
    stockIndex: number,
    cardIndex: number,
    e: Event,
  ) => {
    if (!this.stage) return;
    const checked = (e.target as HTMLInputElement).checked;
    const stocks = [...this.stage.stocks];
    const customCards = [...stocks[stockIndex].customCards];
    customCards[cardIndex] = {...customCards[cardIndex], enabled: checked};
    stocks[stockIndex] = {...stocks[stockIndex], customCards};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateCustomCardTitle = (
    stockIndex: number,
    cardIndex: number,
    e: Event,
  ) => {
    if (!this.stage) return;
    const value = (e.target as HTMLInputElement).value;
    const stocks = [...this.stage.stocks];
    const customCards = [...stocks[stockIndex].customCards];
    customCards[cardIndex] = {...customCards[cardIndex], title: value};
    stocks[stockIndex] = {...stocks[stockIndex], customCards};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateCustomCardValue = (
    stockIndex: number,
    cardIndex: number,
    e: Event,
  ) => {
    if (!this.stage) return;
    const value = (e.target as HTMLInputElement).value;
    const stocks = [...this.stage.stocks];
    const customCards = [...stocks[stockIndex].customCards];
    customCards[cardIndex] = {...customCards[cardIndex], value};
    stocks[stockIndex] = {...stocks[stockIndex], customCards};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };

  private updateCustomCardSubtext = (
    stockIndex: number,
    cardIndex: number,
    e: Event,
  ) => {
    if (!this.stage) return;
    const value = (e.target as HTMLInputElement).value;
    const stocks = [...this.stage.stocks];
    const customCards = [...stocks[stockIndex].customCards];
    customCards[cardIndex] = {...customCards[cardIndex], subtext: value};
    stocks[stockIndex] = {...stocks[stockIndex], customCards};
    this.experimentEditor.updateStage({
      ...this.stage,
      stocks,
    });
  };
}
