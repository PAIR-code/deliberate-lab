import '../participant_profile/avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
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
  @state() private maximizedImageUrl: string | null = null;
  private modalElement: HTMLDivElement | null = null;

  private openImageModal(imageUrl: string) {
    this.maximizedImageUrl = imageUrl;
  }

  private closeImageModal() {
    this.maximizedImageUrl = null;
  }

  private handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.maximizedImageUrl) {
      this.closeImageModal();
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleEscapeKey);
    this.removeModalFromBody();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('maximizedImageUrl')) {
      if (this.maximizedImageUrl) {
        this.renderModalToBody();
      } else {
        this.removeModalFromBody();
      }
    }
  }

  private renderModalToBody() {
    // Remove existing modal if present
    this.removeModalFromBody();

    // Create modal element
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'chat-image-modal';
    this.modalElement.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      cursor: pointer;
      animation: fadeIn 0.2s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      max-width: 95vw;
      max-height: 95vh;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border: 2px solid var(--md-sys-color-outline);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      z-index: 2;
    `;
    closeButton.addEventListener('click', () => this.closeImageModal());
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'var(--md-sys-color-surface-variant)';
      closeButton.style.transform = 'scale(1.1)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'var(--md-sys-color-surface)';
      closeButton.style.transform = 'scale(1)';
    });

    const img = document.createElement('img');
    img.src = this.maximizedImageUrl!;
    img.alt = 'Maximized Image';
    img.style.cssText = `
      max-width: 100%;
      max-height: 95vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    img.addEventListener('click', (e) => e.stopPropagation());

    content.appendChild(img);
    this.modalElement.appendChild(content);
    this.modalElement.appendChild(closeButton);
    this.modalElement.addEventListener('click', () => this.closeImageModal());

    // Append modal to body
    document.body.appendChild(this.modalElement);

    // Add fade-in keyframes if not already present
    if (!document.getElementById('chat-modal-keyframes')) {
      const style = document.createElement('style');
      style.id = 'chat-modal-keyframes';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private removeModalFromBody() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
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
