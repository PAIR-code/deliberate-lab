import '../../pair-components/button';
import '../../pair-components/icon_button';
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
 * Renders 🪄 Generate, ✨ Enhance, and 🔄 Refresh buttons for AI-assisted
 * persona writing.
 *
 * - Generate: writes a full character sketch on empty field; merge-expands on
 *   existing text to incorporate it into a full ~250-word sketch.
 * - Enhance: appends 1-2 specific episodic memories to existing sketch.
 *   Disabled when field is empty.
 * - Refresh: ⚠️ clears and regenerates from scratch. Shows warning if text.
 *
 * Fires a `persona-text-change` CustomEvent with `{ text, mode }` on success.
 * The parent is responsible for applying the text.
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
  @state() private isEnhancing = false;
  @state() private isRefreshing = false;
  @state() private errorMessage = '';

  private get creatorId(): string {
    return this.authService.experimenterData?.email ?? '';
  }

  private get modelDisabled(): boolean {
    return !this.modelSettings?.modelName || !this.modelSettings?.apiType;
  }

  private get isAnyLoading(): boolean {
    return this.isGenerating || this.isEnhancing || this.isRefreshing;
  }

  private async runGeneration(mode: PersonaGenerationMode) {
    if (!this.modelSettings || this.modelDisabled || this.disabled) return;

    if (mode === 'generate') this.isGenerating = true;
    else if (mode === 'enhance') this.isEnhancing = true;
    else if (mode === 'refresh') this.isRefreshing = true;
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
      this.isEnhancing = false;
      this.isRefreshing = false;
    }
  }

  override render() {
    const hasExistingText = this.currentText.trim().length > 0;

    const modelTooltip = this.modelDisabled
      ? 'Select a model to use this feature'
      : '';

    const generateTooltip = this.modelDisabled
      ? modelTooltip
      : 'Generate or fill out your persona prompt';

    const refreshTooltip = this.modelDisabled
      ? modelTooltip
      : hasExistingText
        ? '⚠️ Erase and regenerate persona from scratch'
        : 'Regenerate persona from scratch';

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
            🪄 Generate
          </pr-button>
        </pr-tooltip>

        <pr-tooltip
          text=${this.modelDisabled
            ? modelTooltip
            : 'Add episodic memories to enrich this persona'}
          position="TOP_START"
          displayMode="inline-flex"
        >
          <pr-button
            color="secondary"
            variant="outlined"
            ?disabled=${isButtonsDisabled || !hasExistingText}
            ?loading=${this.isEnhancing}
            @click=${() => this.runGeneration('enhance')}
          >
            ✨ Enhance
          </pr-button>
        </pr-tooltip>

        <pr-tooltip
          text=${refreshTooltip}
          position="TOP_START"
          displayMode="inline-flex"
        >
          <pr-icon-button
            icon="refresh"
            color="neutral"
            variant="default"
            ?disabled=${isButtonsDisabled || !hasExistingText}
            ?loading=${this.isRefreshing}
            @click=${() => this.runGeneration('refresh')}
          >
          </pr-icon-button>
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
