import '../../pair-components/textarea';
import '../../pair-components/textarea_template';

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

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  FlipCardStageConfig,
  FlipCard,
  createFlipCard,
} from '@deliberation-lab/utils';

import {styles} from './flipcard_editor.scss';

/** FlipCard stage editor for experiment builder. */
@customElement('flipcard-editor')
export class FlipCardEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: FlipCardStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="section">
        <div class="header">
          <div class="title">FlipCard Settings</div>
        </div>

        ${this.renderSettings()} ${this.renderCardsSection()}
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
              ?checked=${this.stage.enableSelection}
              @change=${this.updateEnableSelection}
            ></md-checkbox>
            Enable card selection
          </label>
        </div>

        <div class="setting-row">
          <label class="field-label"
            >Minimum unique cards flipped requirement (0 = disabled)</label
          >
          <md-filled-text-field
            type="number"
            .value=${this.stage.minUniqueCardsFlippedRequirement.toString()}
            @input=${this.updateMinUniqueCardsFlippedRequirement}
            min="0"
            max="${this.stage.cards.length}"
            ?disabled=${!this.experimentEditor.canEditStages}
          ></md-filled-text-field>
        </div>

        <div class="setting-row">
          <label class="checkbox-label">
            <md-checkbox
              ?checked=${this.stage.shuffleCards}
              @change=${this.updateShuffleCards}
            ></md-checkbox>
            Shuffle card order for each participant
          </label>
        </div>

        ${this.stage.enableSelection
          ? html`
              <div class="setting-row">
                <label class="checkbox-label">
                  <md-checkbox
                    ?checked=${this.stage.allowMultipleSelections}
                    @change=${this.updateAllowMultipleSelections}
                  ></md-checkbox>
                  Allow multiple selections
                </label>
              </div>

              <div class="setting-row">
                <label class="checkbox-label">
                  <md-checkbox
                    ?checked=${this.stage.requireConfirmation}
                    @change=${this.updateRequireConfirmation}
                  ></md-checkbox>
                  Require confirmation to complete stage
                </label>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderCardsSection() {
    if (!this.stage) return nothing;

    return html`
      <div class="cards-section">
        <div class="header">
          <div class="title">Cards (${this.stage.cards.length})</div>
          <md-filled-button @click=${this.addCard}>
            <md-icon slot="icon">add</md-icon>
            Add Card
          </md-filled-button>
        </div>

        <div class="cards-list">
          ${this.stage.cards.map((card, index) =>
            this.renderCardEditor(card, index),
          )}
        </div>
      </div>
    `;
  }

  private renderCardEditor(card: FlipCard, index: number) {
    return html`
      <div class="card-editor">
        <div class="card-header">
          <div class="card-title-label">Card ${index + 1}</div>
          <md-icon-button @click=${() => this.removeCard(index)}>
            <md-icon>delete</md-icon>
          </md-icon-button>
        </div>

        <div class="card-fields">
          <div class="field">
            <label class="field-label">Title*</label>
            <pr-textarea-template
              .value=${card.title}
              @input=${(e: InputEvent) =>
                this.updateCardTitle(
                  index,
                  (e.target as HTMLTextAreaElement).value,
                )}
              placeholder="Enter card title"
              size="medium"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></pr-textarea-template>
          </div>

          <div class="field">
            <label class="field-label">Front Content*</label>
            <pr-textarea-template
              .value=${card.frontContent}
              @input=${(e: InputEvent) =>
                this.updateCardFrontContent(
                  index,
                  (e.target as HTMLTextAreaElement).value,
                )}
              placeholder="Enter content for the front of the card"
              size="large"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></pr-textarea-template>
          </div>

          <div class="field">
            <label class="field-label">Back Content*</label>
            <pr-textarea-template
              .value=${card.backContent}
              @input=${(e: InputEvent) =>
                this.updateCardBackContent(
                  index,
                  (e.target as HTMLTextAreaElement).value,
                )}
              placeholder="Enter additional content for the back of the card"
              size="large"
              ?disabled=${!this.experimentEditor.canEditStages}
            ></pr-textarea-template>
          </div>
        </div>
      </div>
    `;
  }

  private updateEnableSelection(e: Event) {
    if (!this.stage) return;

    const target = e.target as HTMLInputElement;
    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      enableSelection: target.checked,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateMinUniqueCardsFlippedRequirement(e: Event) {
    if (!this.stage) return;

    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10) || 0;
    const maxValue = this.stage.cards.length;
    const minMaxValue = Math.max(0, Math.min(value, maxValue));

    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      minUniqueCardsFlippedRequirement: minMaxValue,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateShuffleCards(e: Event) {
    if (!this.stage) return;

    const target = e.target as HTMLInputElement;
    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      shuffleCards: target.checked,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateAllowMultipleSelections(e: Event) {
    if (!this.stage) return;

    const target = e.target as HTMLInputElement;
    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      allowMultipleSelections: target.checked,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateRequireConfirmation(e: Event) {
    if (!this.stage) return;

    const target = e.target as HTMLInputElement;
    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      requireConfirmation: target.checked,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private addCard() {
    if (!this.stage) return;

    const newCard = createFlipCard();

    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      cards: [...this.stage.cards, newCard],
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private removeCard(index: number) {
    if (!this.stage) return;

    const updatedCards = [...this.stage.cards];
    updatedCards.splice(index, 1);

    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      cards: updatedCards,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateCardTitle(index: number, title: string) {
    if (!this.stage) return;

    const updatedCards = [...this.stage.cards];
    updatedCards[index] = {
      ...updatedCards[index],
      title,
    };

    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      cards: updatedCards,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateCardFrontContent(index: number, frontContent: string) {
    if (!this.stage) return;

    const updatedCards = [...this.stage.cards];
    updatedCards[index] = {
      ...updatedCards[index],
      frontContent,
    };

    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      cards: updatedCards,
    };

    this.experimentEditor.updateStage(updatedStage);
  }

  private updateCardBackContent(index: number, backContent: string) {
    if (!this.stage) return;

    const updatedCards = [...this.stage.cards];
    updatedCards[index] = {
      ...updatedCards[index],
      backContent,
    };

    const updatedStage: FlipCardStageConfig = {
      ...this.stage,
      cards: updatedCards,
    };

    this.experimentEditor.updateStage(updatedStage);
  }
}
