import '../participant_profile/avatar_icon';

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

import {ChatMessage, UserType} from '@deliberation-lab/utils';
import {
  convertUnifiedTimestampToDate,
  getHashBasedColor,
  getProfileBasedColor,
} from '../../shared/utils';

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
      case UserType.PARTICIPANT:
        return this.renderParticipantMessage(this.chat);
      default:
        return this.renderMediatorMessage(this.chat);
    }
  }

  renderParticipantMessage(chatMessage: ChatMessage) {
    const classes = classMap({
      'chat-message': true,
      'current-user':
        chatMessage.senderId === this.participantService.profile?.publicId,
    });

    const profile = chatMessage.profile;
    // Use profile ID to determine color
    const color = () => {
      // If no name, use default background
      if (!chatMessage.profile?.name) {
        return '';
      }
      // Otherwise, use profile ID/avatar to determine color
      return getProfileBasedColor(
        chatMessage.senderId ?? '',
        profile.avatar ?? '',
      );
    };

    return html`
      <div class=${classes}>
        <avatar-icon .emoji=${profile.avatar} .color=${color()}> </avatar-icon>
        <div class="content">
          <div class="label">
            ${profile.name ?? chatMessage.senderId}
            ${profile.pronouns ? `(${profile.pronouns})` : ''}

            <span class="date"
              >${convertUnifiedTimestampToDate(
                chatMessage.timestamp,
                false,
              )}</span
            >
          </div>
          <div class="chat-bubble">${chatMessage.message}</div>
        </div>
      </div>
    `;
  }

  renderMediatorMessage(chatMessage: ChatMessage) {
    const profile = chatMessage.profile;

    return html`
      <div class="chat-message">
        <avatar-icon
          .emoji=${profile.avatar}
          .color=${getHashBasedColor(chatMessage.senderId ?? '')}
        >
        </avatar-icon>
        <div class="content">
          <div class="label">
            ${profile.name}
            <span class="date"
              >${convertUnifiedTimestampToDate(
                chatMessage.timestamp,
                false,
              )}</span
            >
          </div>
          <div class="chat-bubble">${chatMessage.message}</div>
          ${this.renderDebuggingExplanation(chatMessage)}
        </div>
      </div>
    `;
  }

  renderDebuggingExplanation(chatMessage: ChatMessage) {
    if (!this.authService.isDebugMode) return nothing;

    return html` <div class="debug">${chatMessage.explanation}</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-message': ChatMessageComponent;
  }
}
