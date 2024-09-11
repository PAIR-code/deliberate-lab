import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import './chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  ChatMessage,
  ParticipantProfile,
} from '@deliberation-lab/utils';
import {styles} from './chat_interface.scss';

/** Chat interface component */
@customElement('chat-interface')
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() value = '';
  @property() disableInput = false;
  @property() showInfo = false;

  private sendUserInput() {
    this.participantService.createChatMessage(
      { message: this.value.trim() }
    );
    this.value = '';
  }

  private renderChatMessage(chatMessage: ChatMessage) {
    return html`
      <div class="chat-message-wrapper">
        <chat-message .chat=${chatMessage}></chat-message>
      </div>
    `;
  }

  private renderChatHistory() {
    const stageId = this.participantService.profile?.currentStageId ?? '';
    const messages = this.cohortService.chatMap[stageId];
    if (!messages) return nothing;

    return html`
      <div class="chat-scroll">
        <div class="chat-history">
          ${messages.map(this.renderChatMessage.bind(this))}
        </div>
      </div>
    `;
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
          ?disabled=${this.disableInput || this.participantService.disableStage}
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
            .disabled=${this.value === '' || this.disableInput || this.participantService.disableStage}
            ?loading=${this.participantService.isSendingChat}
            @click=${this.sendUserInput}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    </div>`;
  }

  override render() {
    return html`
      <div class="chat-content">
        ${this.renderChatHistory()}
      </div>
      <div class="input-row-wrapper">
        <div class="input-row">${this.renderInput()}</div>
      </div>
      <stage-footer></stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-interface': ChatInterface;
  }
}
