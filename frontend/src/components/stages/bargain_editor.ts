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
      <div class="info-box">
        <div class="info-title">ℹ️ Randomization Note</div>
        <div>
          Most game parameters (maxTurns, chat enabled, opponent info visibility)
          are randomly assigned per game instance during initialization in the backend.
          The configuration values below are defaults that will be used as the basis
          for randomization ranges.
        </div>
      </div>
      ${this.renderItemName()}
      ${this.renderValuationRanges()}
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

      <div class="section">
        <div class="title">Randomized Parameters</div>
        <div class="description">
          The following parameters are automatically randomized for each game instance:
        </div>
        <ul style="color: var(--md-sys-color-on-surface-variant); margin-top: 8px;">
          <li><strong>Max turns:</strong> Randomly selected from [6, 8, 10, 12]</li>
          <li><strong>Chat enabled:</strong> Randomly enabled or disabled</li>
          <li><strong>Opponent info visibility:</strong> Each participant independently has a 50% chance to see opponent's valuation range</li>
          <li><strong>First mover:</strong> Randomly assigned (one buyer, one seller)</li>
          <li><strong>Roles:</strong> Randomly assigned from participants</li>
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
