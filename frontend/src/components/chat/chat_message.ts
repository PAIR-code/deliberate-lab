import '../participant_profile/avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {ChatMessage, UserType} from '@deliberation-lab/utils';
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
  private maximizedImageUrl: string | null = null;
  private modalElement: HTMLDivElement | null = null;
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;

  private openImageModal(imageUrl: string) {
    this.maximizedImageUrl = imageUrl;
    this.renderModalToBody();
  }

  private closeImageModal() {
    this.maximizedImageUrl = null;
    this.removeModalFromBody();
  }

  private renderModalToBody() {
    // Remove existing modal if present
    this.removeModalFromBody();

    // Create modal element
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'chat-image-modal';
    this.modalElement.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-content">
          <button class="close-button">✕</button>
          <img src="${this.maximizedImageUrl}" alt="Maximized Image" />
        </div>
      </div>
    `;

    // Add event listeners
    const backdrop = this.modalElement.querySelector('.modal-backdrop');
    const closeButton = this.modalElement.querySelector('.close-button');
    const img = this.modalElement.querySelector('img');

    backdrop?.addEventListener('click', () => this.closeImageModal());
    closeButton?.addEventListener('click', () => this.closeImageModal());
    img?.addEventListener('click', (e) => e.stopPropagation());

    // Add keyboard listener for Escape key
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeImageModal();
      }
    };
    document.addEventListener('keydown', this.keyboardHandler);

    // Add styles
    this.injectModalStyles();

    // Append to body
    document.body.appendChild(this.modalElement);
  }

  private removeModalFromBody() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
    // Remove keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  private injectModalStyles() {
    // Check if styles already exist
    if (document.getElementById('chat-message-modal-styles')) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'chat-message-modal-styles';
    styleElement.textContent = `
      .chat-image-modal .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.92);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        cursor: pointer;
        animation: fadeIn 0.2s ease;
      }

      .chat-image-modal .modal-content {
        position: relative;
        max-width: 95vw;
        max-height: 95vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .chat-image-modal .modal-content img {
        max-width: 100%;
        max-height: 95vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .chat-image-modal .close-button {
        position: absolute;
        top: -40px;
        right: 0;
        background: #fff;
        color: #000;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: background 0.2s ease;
      }

      .chat-image-modal .close-button:hover {
        background: #f0f0f0;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(styleElement);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeModalFromBody();
  }

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
          <div class="chat-bubble">
            ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
          </div>
          ${this.renderDebuggingExplanation(chatMessage)}
          ${chatMessage.imageUrls && chatMessage.imageUrls.length > 0
            ? chatMessage.imageUrls.map(
                (imageUrl) =>
                  html`<img
                    src="${imageUrl}"
                    alt="Generated Image"
                    class="generated-image"
                    @click=${() => this.openImageModal(imageUrl)}
                  />`,
              )
            : nothing}
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
          <div class="chat-bubble">
            ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
          </div>
          ${this.renderDebuggingExplanation(chatMessage)}
          ${chatMessage.imageUrls && chatMessage.imageUrls.length > 0
            ? chatMessage.imageUrls.map(
                (imageUrl) =>
                  html`<img
                    src="${imageUrl}"
                    alt="Generated Image"
                    class="generated-image"
                    @click=${() => this.openImageModal(imageUrl)}
                  />`,
              )
            : nothing}
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

  renderDebuggingExplanation(chatMessage: ChatMessage) {
    if (!this.authService.isDebugMode || !chatMessage.explanation) {
      return nothing;
    }

    return html` <div class="debug">${chatMessage.explanation}</div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-message': ChatMessageComponent;
  }
}
