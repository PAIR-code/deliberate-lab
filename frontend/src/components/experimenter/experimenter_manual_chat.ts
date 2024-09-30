import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {RouterService} from '../../services/router.service';

import {styles} from './experimenter_manual_chat.scss';

/** Experimenter manual chat interface component */
@customElement('experimenter-manual-chat')
export class Chat extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly routerService = core.getService(RouterService);

  @property() value = '';
  @state() isLoading = false;

  private sendUserInput() {
    if (this.value.trim() === '') return;
    // Send chat message
    this.experimentManager.createManualChatMessage(
      this.routerService.activeRoute.params['stage'],
      { message: this.value.trim() }
    );
    this.value = '';
  }

  private renderInput() {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.sendUserInput();
        e.stopPropagation();
      }
    };

    const handleInput = (e: Event) => {
      this.value = (e.target as HTMLTextAreaElement).value;
    };

    const autoFocus = () => {
      // Only auto-focus chat input if on desktop
      return navigator.maxTouchPoints === 0;
    };

    return html`<div class="input-wrapper">
      <div class="input">
        <pr-textarea
          size="small"
          placeholder="Send message"
          .value=${this.value}
          ?focused=${autoFocus()}
          ?disabled=${this.isLoading}
          @keyup=${handleKeyUp}
          @input=${handleInput}
        >
        </pr-textarea>
        <pr-tooltip
          text="Send message"
          color="tertiary"
          variant="outlined"
          position="TOP_END"
        >
          <pr-icon-button
            icon="send"
            variant="tonal"
            .disabled=${this.value.trim() === '' || this.isLoading}
            @click=${this.sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    </div>`;
  }

  override render() {
    if (!this.authService.isExperimenter) return nothing;

    const stageId = this.routerService.activeRoute.params['stage'];

    return html`
      <div class="input-row-wrapper">
        <div class="input-row">${this.renderInput()}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-manual-chat': Chat;
  }
}