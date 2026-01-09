import '../participant_profile/avatar_icon';
import '../shared/media_preview';

import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {ChatMessage, StoredFile, UserType} from '@deliberation-lab/utils';
import {
  convertMarkdownToHTML,
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
      case UserType.SYSTEM:
        return this.renderSystemMessage(this.chat);
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
          ${chatMessage.message
            ? html`<div class="chat-bubble">
                ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
              </div>`
            : nothing}
          ${this.renderDebuggingInfo(chatMessage)}
          ${this.renderFiles(chatMessage.files)}
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
          ${chatMessage.message
            ? html`<div class="chat-bubble">
                ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
              </div>`
            : nothing}
          ${this.renderDebuggingInfo(chatMessage)}
          ${this.renderFiles(chatMessage.files)}
        </div>
      </div>
    `;
  }

  renderSystemMessage(chatMessage: ChatMessage) {
    return html`
      <div class="system-message">
        <div class="content">
          ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
        </div>
      </div>
    `;
  }

  renderFiles(files?: StoredFile[]) {
    if (!files || files.length === 0) {
      return nothing;
    }

    return files.map(
      (file) => html`<media-preview .file=${file}></media-preview>`,
    );
  }

  renderDebuggingInfo(chatMessage: ChatMessage) {
    if (!this.authService.isDebugMode) {
      return nothing;
    }

    const hasExplanation =
      chatMessage.explanation && chatMessage.explanation.length > 0;
    const hasReasoning =
      chatMessage.reasoning && chatMessage.reasoning.length > 0;

    if (!hasExplanation && !hasReasoning) {
      return nothing;
    }

    return html`
      <div class="debug-container">
        ${hasExplanation
          ? html`<div class="debug explanation">
              <span class="debug-label">📝 Explanation:</span>
              ${chatMessage.explanation}
            </div>`
          : nothing}
        ${hasReasoning
          ? html`<div class="debug reasoning">
              <span class="debug-label">🧠 Reasoning:</span>
              ${chatMessage.reasoning}
            </div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-message': ChatMessageComponent;
  }
}
