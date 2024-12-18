import '../participant_profile/profile_avatar';

import {observable} from 'mobx';
import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {Timestamp} from 'firebase/firestore';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  AgentAgentChatMessage,
  ChatMessage,
  ChatMessageType,
  HumanAgentChatMessage,
  ParticipantChatMessage,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

import {styles} from './chat_message.scss';

/** Chat message component */
@customElement('chat-message')
export class ChatMessageComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() chat: ChatMessage | undefined = undefined;

  override render() {
    if (!this.chat) {
      return nothing;
    }

    switch (this.chat.type) {
      case ChatMessageType.PARTICIPANT:
        return this.renderParticipantMessage(this.chat);
      case ChatMessageType.HUMAN_AGENT:
        return this.renderHumanAgentMessage(this.chat);
      case ChatMessageType.AGENT_AGENT:
        return this.renderAgentAgentMessage(this.chat);
      default:
        return nothing;
    }
  }

  renderParticipantMessage(chatMessage: ParticipantChatMessage) {
    const classes = classMap({
      'chat-message': true,
      'current-user':
        chatMessage.participantPublicId ===
        this.participantService.profile?.publicId,
    });

    const profile = chatMessage.profile;

    return html`
      <div class=${classes}>
        <profile-avatar .emoji=${profile.avatar}></profile-avatar>
        <div class="content">
          <div class="label">
            ${profile.name ?? chatMessage.participantPublicId}
            ${profile.pronouns ? `(${profile.pronouns})` : ''}

            <span class="date"
              >${convertUnifiedTimestampToDate(
                chatMessage.timestamp,
                false
              )}</span
            >
          </div>
          <div class="chat-bubble">${chatMessage.message}</div>
        </div>
      </div>
    `;
  }

  renderHumanAgentMessage(chatMessage: HumanAgentChatMessage) {
    const profile = chatMessage.profile;

    return html`
      <div class="chat-message">
        <profile-avatar .emoji=${profile.avatar}></profile-avatar>
        <div class="content">
          <div class="label">
            ${profile.name}
            <span class="date"
              >${convertUnifiedTimestampToDate(
                chatMessage.timestamp,
                false
              )}</span
            >
          </div>
          <div class="chat-bubble">${chatMessage.message}</div>
        </div>
      </div>
    `;
  }

  renderAgentAgentMessage(chatMessage: AgentAgentChatMessage) {
    const profile = chatMessage.profile;

    return html`
      <div class="chat-message">
        <profile-avatar .emoji=${profile.avatar}></profile-avatar>
        <div class="content">
          <div class="label">
            ${profile.name}
            <span class="date"
              >${convertUnifiedTimestampToDate(
                chatMessage.timestamp,
                false
              )}</span
            >
          </div>
          <div class="chat-bubble">${chatMessage.message}</div>
          ${this.renderDebuggingExplanation(chatMessage)}
        </div>
      </div>
    `;
  }

  renderDebuggingExplanation(chatMessage: AgentAgentChatMessage) {
    if (!this.authService.isDebugMode) return nothing;

    return html` <div class="debug">${chatMessage.explanation}</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-message': ChatMessageComponent;
  }
}
