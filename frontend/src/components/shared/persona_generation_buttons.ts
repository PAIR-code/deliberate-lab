import '../../pair-components/button';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {FirebaseService} from '../../services/firebase.service';

import {
  AgentModelSettings,
  ModelResponseStatus,
  PersonaGenerationMode,
} from '@deliberation-lab/utils';

import {generatePersonaContextCallable} from '../../shared/callables';
import {styles} from './persona_generation_buttons.scss';

/**
 * Renders 🪄 Generate and ✨ Embellish buttons for AI-assisted persona writing.
 *
 * - Generate: writes a full character sketch covering all 8 simulacra
 *   dimensions. Shows an overwrite warning if the field already has text.
 * - Embellish: appends a short, coherent addition to the existing sketch.
 *   On an empty field, behaves identically to Generate.
 *
 * Fires a `persona-text-change` CustomEvent with `{ text, mode }` on success.
 * The parent is responsible for applying the text (replacing or appending).
 */
@customElement('persona-generation-buttons')
export class PersonaGenerationButtons extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly firebaseService = core.getService(FirebaseService);

  @property() currentText = '';
  @property({type: Object}) modelSettings: AgentModelSettings | undefined =
    undefined;
  @property({type: Boolean}) disabled = false;

  @state() private isGenerating = false;
  @state() private isEmbellishing = false;
  @state() private errorMessage = '';

  private get creatorId(): string {
    return this.authService.experimenterData?.email ?? '';
  }

  private get modelDisabled(): boolean {
    return !this.modelSettings?.modelName || !this.modelSettings?.apiType;
  }

  private get isAnyLoading(): boolean {
    return this.isGenerating || this.isEmbellishing;
  }

  private async runGeneration(mode: PersonaGenerationMode) {
    if (!this.modelSettings || this.modelDisabled || this.disabled) return;

    const isGenerating = mode === 'generate';
    if (isGenerating) {
      this.isGenerating = true;
    } else {
      this.isEmbellishing = true;
    }
    this.errorMessage = '';

    try {
      const response = await generatePersonaContextCallable(
        this.firebaseService.functions,
        {
          creatorId: this.creatorId,
          mode,
          currentText: this.currentText,
          apiType: this.modelSettings.apiType,
          modelName: this.modelSettings.modelName,
        },
      );

      if (
        (response.status === ModelResponseStatus.OK ||
          response.status === ModelResponseStatus.LENGTH_ERROR) &&
        response.text
      ) {
        this.dispatchEvent(
          new CustomEvent('persona-text-change', {
            detail: {text: response.text, mode},
            bubbles: true,
            composed: true,
          }),
        );
      } else {
        this.errorMessage =
          response.errorMessage ?? 'An error occurred. Please try again.';
      }
    } catch (e) {
      this.errorMessage = 'An error occurred. Please try again.';
    } finally {
      this.isGenerating = false;
      this.isEmbellishing = false;
    }
  }

  override render() {
    const modelTooltip = this.modelDisabled
      ? 'Select a model to use this feature'
      : '';

    const hasExistingText = this.currentText.trim().length > 0;
    const generateTooltip = this.modelDisabled
      ? modelTooltip
      : hasExistingText
        ? 'This will overwrite your current persona text'
        : '';

    const isButtonsDisabled =
      this.disabled || this.modelDisabled || this.isAnyLoading;

    return html`
      <div class="persona-generation-row">
        <pr-tooltip
          text=${generateTooltip}
          position="TOP_START"
          displayMode="inline-flex"
        >
          <pr-button
            color="secondary"
            variant="outlined"
            ?disabled=${isButtonsDisabled}
            ?loading=${this.isGenerating}
            @click=${() => this.runGeneration('generate')}
          >
            ${hasExistingText && !this.modelDisabled ? '⚠️ ' : '🪄 '}Generate
          </pr-button>
        </pr-tooltip>

        <pr-tooltip
          text=${modelTooltip}
          position="TOP_START"
          displayMode="inline-flex"
        >
          <pr-button
            color="secondary"
            variant="outlined"
            ?disabled=${isButtonsDisabled || !hasExistingText}
            ?loading=${this.isEmbellishing}
            @click=${() => this.runGeneration('embellish')}
          >
            ✨ Embellish
          </pr-button>
        </pr-tooltip>
      </div>
      ${this.errorMessage
        ? html`<div class="error-message">${this.errorMessage}</div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'persona-generation-buttons': PersonaGenerationButtons;
  }
}
