import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import './chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ChatService} from '../../services/chat_service';
import {ExperimentService} from '../../services/experiment_service';

import {
  Message,
  PARTICIPANT_COMPLETION_TYPE,
  ParticipantProfile,
} from '@llm-mediation-experiments/utils';
import {styles} from './chat_interface.scss';

/** Chat interface component */
@customElement('chat-interface')
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly chatService = core.getService(ChatService);
  private readonly experimentService = core.getService(ExperimentService);

  @property() value = '';
  @property() disableInput = false;
  @property() showInfo = false;

  private sendUserInput() {
    this.chatService.sendUserMessage(this.value.trim());
    this.value = '';
  }

  private renderChatMessage(chatMessage: Message) {
    return html`
      <div class="chat-message-wrapper">
        <chat-message .chatMessage=${chatMessage}> </chat-message>
      </div>
    `;
  }

  private renderChatHistory() {
    return html`
      <div class="chat-scroll">
        <div class="chat-history">
          ${this.chatService.messages.map(this.renderChatMessage.bind(this))}
        </div>
      </div>
    `;
  }

  private renderChatInfo() {
    const renderParticipant = (participant: ParticipantProfile) => {
      const isDisabled =
        participant.completedExperiment &&
        participant.completionType !== PARTICIPANT_COMPLETION_TYPE.SUCCESS;
      return html`
        <div class="chat-participant">
          <profile-avatar
            .emoji=${participant.avatarUrl}
            .disabled=${isDisabled}
          ></profile-avatar>
          <div>
            ${participant.name ?? participant.publicId}
            (${participant.pronouns})
          </div>
        </div>
      `;
    };

    return html`
      <div class="chat-info">
        <div class="chat-participants-wrapper">
          ${this.experimentService
            .getParticipantProfiles()
            .map((participant) => renderParticipant(participant))}
        </div>
        <div class="label">Group Discussion</div>
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
          ?disabled=${this.disableInput}
          @keyup=${handleKeyUp}
          @input=${handleInput}
        >
        </pr-textarea>
        <pr-tooltip
          text="Send message"
          color="tertiary"
          variant="outlined"
          position="TOP_RIGHT"
        >
          <pr-icon-button
            icon="send"
            variant="tonal"
            .disabled=${this.value === '' || this.disableInput}
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
        ${this.showInfo ? this.renderChatInfo() : nothing}
      </div>
      <div class="input-row-wrapper">
        <div class="input-row">${this.renderInput()}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-interface': ChatInterface;
  }
}
