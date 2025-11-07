import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {BargainStageConfig} from '@deliberation-lab/utils';

import {styles} from './bargain_editor.scss';

/** Editor for bargain stage. */
@customElement('bargain-editor')
export class BargainEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: BargainStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.renderItemName()}
      ${this.renderValuationRanges()}
      ${this.renderGameSettings()}
      ${this.renderRandomizationInfo()}
    `;
  }

  private renderItemName() {
    if (!this.stage) return nothing;

    const updateItemName = (e: InputEvent) => {
      if (!this.stage) return;
      const itemName = (e.target as HTMLInputElement).value;
      this.experimentEditor.updateStage({...this.stage, itemName});
    };

    return html`
      <div class="section">
        <div class="title">Item Being Negotiated</div>
        <div class="description">
          The item that the buyer and seller are negotiating over.
        </div>
        <div class="text-input">
          <label for="itemName">Item name</label>
          <input
            type="text"
            id="itemName"
            placeholder="mug"
            name="itemName"
            .value=${this.stage.itemName}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateItemName}
          />
        </div>
      </div>
    `;
  }

  private renderValuationRanges() {
    if (!this.stage) return nothing;

    const updateBuyerMin = (e: InputEvent) => {
      if (!this.stage) return;
      const buyerValuationMin = Number((e.target as HTMLInputElement).value);
      this.experimentEditor.updateStage({...this.stage, buyerValuationMin});
    };

    const updateBuyerMax = (e: InputEvent) => {
      if (!this.stage) return;
      const buyerValuationMax = Number((e.target as HTMLInputElement).value);
      this.experimentEditor.updateStage({...this.stage, buyerValuationMax});
    };

    const updateSellerMin = (e: InputEvent) => {
      if (!this.stage) return;
      const sellerValuationMin = Number((e.target as HTMLInputElement).value);
      this.experimentEditor.updateStage({...this.stage, sellerValuationMin});
    };

    const updateSellerMax = (e: InputEvent) => {
      if (!this.stage) return;
      const sellerValuationMax = Number((e.target as HTMLInputElement).value);
      this.experimentEditor.updateStage({...this.stage, sellerValuationMax});
    };

    return html`
      <div class="section">
        <div class="title">Valuation Ranges</div>
        <div class="description">
          Random valuations will be drawn from these ranges. The system ensures
          buyer valuation ≥ seller valuation for each game instance.
        </div>

        <div class="number-input">
          <label for="buyerMin">Buyer valuation minimum ($)</label>
          <input
            type="number"
            id="buyerMin"
            name="buyerMin"
            min="0"
            step="1"
            .value=${this.stage.buyerValuationMin}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateBuyerMin}
          />
        </div>

        <div class="number-input">
          <label for="buyerMax">Buyer valuation maximum ($)</label>
          <input
            type="number"
            id="buyerMax"
            name="buyerMax"
            min="0"
            step="1"
            .value=${this.stage.buyerValuationMax}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateBuyerMax}
          />
        </div>

        <div class="number-input">
          <label for="sellerMin">Seller valuation minimum ($)</label>
          <input
            type="number"
            id="sellerMin"
            name="sellerMin"
            min="0"
            step="1"
            .value=${this.stage.sellerValuationMin}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateSellerMin}
          />
        </div>

        <div class="number-input">
          <label for="sellerMax">Seller valuation maximum ($)</label>
          <input
            type="number"
            id="sellerMax"
            name="sellerMax"
            min="0"
            step="1"
            .value=${this.stage.sellerValuationMax}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateSellerMax}
          />
        </div>
      </div>
    `;
  }

  private renderGameSettings() {
    if (!this.stage) return nothing;

    const updateShowSellerValuationToBuyer = (e: Event) => {
      if (!this.stage) return;
      const showSellerValuationToBuyer = (e.target as HTMLInputElement).checked;
      this.experimentEditor.updateStage({...this.stage, showSellerValuationToBuyer});
    };

    const updateShowBuyerValuationToSeller = (e: Event) => {
      if (!this.stage) return;
      const showBuyerValuationToSeller = (e.target as HTMLInputElement).checked;
      this.experimentEditor.updateStage({...this.stage, showBuyerValuationToSeller});
    };

    const updateEnableChat = (e: Event) => {
      if (!this.stage) return;
      const enableChat = (e.target as HTMLInputElement).checked;
      this.experimentEditor.updateStage({...this.stage, enableChat});
    };

    const updateMaxTurns = (e: InputEvent) => {
      if (!this.stage) return;
      const maxTurns = Number((e.target as HTMLInputElement).value);
      this.experimentEditor.updateStage({...this.stage, maxTurns});
    };

    return html`
      <div class="section">
        <div class="title">Game Settings</div>
        <div class="description">
          Configure the game parameters for this bargaining stage.
        </div>

        <div class="number-input">
          <label for="maxTurns">Maximum number of turns</label>
          <input
            type="number"
            id="maxTurns"
            name="maxTurns"
            min="1"
            step="1"
            .value=${this.stage.maxTurns}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateMaxTurns}
          />
        </div>

        <div class="checkbox-input">
          <label>
            <input
              type="checkbox"
              .checked=${this.stage.enableChat}
              ?disabled=${!this.experimentEditor.canEditStages}
              @change=${updateEnableChat}
            />
            Enable chat between participants
          </label>
        </div>

        <div class="checkbox-input">
          <label>
            <input
              type="checkbox"
              .checked=${this.stage.showSellerValuationToBuyer}
              ?disabled=${!this.experimentEditor.canEditStages}
              @change=${updateShowSellerValuationToBuyer}
            />
            Show seller's valuation range to buyer
          </label>
        </div>

        <div class="checkbox-input">
          <label>
            <input
              type="checkbox"
              .checked=${this.stage.showBuyerValuationToSeller}
              ?disabled=${!this.experimentEditor.canEditStages}
              @change=${updateShowBuyerValuationToSeller}
            />
            Show buyer's valuation range to seller
          </label>
        </div>
      </div>
    `;
  }

  private renderRandomizationInfo() {
    return html`
      <div class="section">
        <div class="title">Randomized Parameters</div>
        <div class="description">
          The following parameters are automatically randomized for each game instance:
        </div>
        <ul style="color: var(--md-sys-color-on-surface-variant); margin-top: 8px;">
          <li><strong>First mover:</strong> Randomly assigned (one buyer, one seller)</li>
          <li><strong>Roles:</strong> Randomly assigned from participants</li>
          <li><strong>Valuations:</strong> Randomly drawn from the configured ranges above</li>
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bargain-editor': BargainEditorComponent;
  }
}
