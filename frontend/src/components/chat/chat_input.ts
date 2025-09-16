import {observable} from 'mobx';
import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {ParticipantService} from '../../services/participant.service';
import {ExperimentService} from '../../services/experiment.service';

import {styles} from './chat_input.scss';

/** Chat input component */
@customElement('chat-input')
export class ChatInputComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly experimentService = core.getService(ExperimentService);

  @property() stageId = '';
  @property() sendUserInput: (input: string) => void = async (
    input: string,
  ) => {
    if (!this.stageId || !input || input.trim() === '') return;
    await this.participantService.createChatMessage({message: input.trim()});
    this.participantAnswerService.updateChatInput(this.stageId, '');
  };
  @property() storeUserInput: (input: string) => void = (input: string) => {
    if (!this.stageId) return;
    this.participantAnswerService.updateChatInput(this.stageId, input);
  };
  @property() getUserInput: () => string = () => {
    return this.participantAnswerService.getChatInput(this.stageId ?? '');
  };
  @property() isDisabled = false;
  @property() isLoading = false;

  override render() {
    const sendInput = async () => {
      this.isLoading = true;
      await this.sendUserInput(this.getUserInput());
      this.isLoading = false;
    };

    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        sendInput();
        e.stopPropagation();
      }
    };

    const handleInput = (e: Event) => {
      if (!this.stageId) return;

      const value = (e.target as HTMLTextAreaElement).value;
      this.storeUserInput(value);
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Check if bot protection is enabled
      const botProtection =
        this.experimentService.experiment?.defaultCohortConfig?.botProtection ??
        false;
      if (botProtection) {
        e.preventDefault();
        return false;
      }
    };

    const autoFocus = () => {
      // Only auto-focus chat input if on desktop
      return navigator.maxTouchPoints === 0;
    };

    return html`
      <div class="input">
        <pr-textarea
          size="small"
          placeholder="Send message"
          .value=${this.getUserInput()}
          ?focused=${autoFocus()}
          ?disabled=${this.isDisabled}
          @keyup=${handleKeyUp}
          @input=${handleInput}
          @paste=${handlePaste}
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
            ?disabled=${this.isDisabled}
            ?loading=${this.isLoading}
            @click=${sendInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-input': ChatInputComponent;
  }
}
