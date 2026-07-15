import '../participant_profile/avatar_icon';
import '../shared/media_preview';
import '../shared/media_preview_fullscreen';
import {MediaPreviewFullscreen} from '../shared/media_preview_fullscreen';

import {MobxLitElement} from '@adobe/lit-mobx';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {ChatMessage, StoredFile, UserType} from '@deliberation-lab/utils';
import {
  convertMarkdownToHTML,
  convertUnifiedTimestampToDate,
  getHashBasedColor,
  getProfileBasedColor,
  variableAssignmentsIncludeObserver,
  MEDIATOR_OBSERVER_COLOR,
} from '../../shared/utils';

import {styles} from './chat_message.scss';

/** Chat message component */
@customElement('chat-message')
export class ChatMessageComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() chat: ChatMessage | undefined = undefined;
  // Optional explicit avatar color. Used e.g. for the private chat
  // representative, whose color must match the observer (and the group-chat
  // representative) rather than being derived from the mediator's name/id.
  @property() colorOverride = '';
  private fullscreenElement: HTMLElement | null = null;

  // Observer-specific chat coloring (mediators shown blue; that blue reserved
  // away from other speakers) only applies when the experiment assigns the
  // `_isObserver` treatment variable.
  private get reserveMediatorColor(): boolean {
    return variableAssignmentsIncludeObserver(
      this.cohortService.activeParticipants,
    );
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.closeFullscreen();
  }

  private handleMaximize = (e: CustomEvent) => {
    const file = e.detail.file as StoredFile;
    this.showFullscreen(file);
  };

  private showFullscreen = (file: StoredFile) => {
    if (!file) return;
    this.closeFullscreen();

    const el = document.createElement(
      'media-preview-fullscreen',
    ) as MediaPreviewFullscreen;
    el.addEventListener('close', () => this.closeFullscreen());
    document.body.appendChild(el);
    el.file = file;
    this.fullscreenElement = el;
  };

  private closeFullscreen = () => {
    if (this.fullscreenElement) {
      this.fullscreenElement.remove();
      this.fullscreenElement = null;
    }
  };

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

  // A message belongs on the viewing participant's own side of the chat if
  // they sent it directly or their representative (publicId
  // `${publicId}-agent`) sent it, so the participant's own voice stays on
  // one side of the chat.
  private isOwnSideMessage(senderId: string | undefined): boolean {
    const myId = this.participantService.profile?.publicId;
    if (!myId || !senderId) return false;
    return senderId === myId || senderId === `${myId}-agent`;
  }

  renderParticipantMessage(chatMessage: ChatMessage) {
    const classes = classMap({
      'chat-message': true,
      'current-user': this.isOwnSideMessage(chatMessage.senderId),
    });

    const profile = chatMessage.profile;
    // The viewer's own representative is marked "(yours)"; the stored
    // profile name carries no suffix.
    const ownRepSuffix =
      chatMessage.senderId ===
      `${this.participantService.profile?.publicId}-agent`
        ? ' (yours)'
        : '';
    // Use profile ID to determine color
    const color = () => {
      // If no name, use default background
      if (!chatMessage.profile?.name) {
        return '';
      }
      // Otherwise, use profile ID/avatar to determine color, reserving the
      // mediator color (blue) away from participants when applicable.
      return getProfileBasedColor(
        chatMessage.senderId ?? '',
        profile.avatar ?? '',
        this.reserveMediatorColor ? [MEDIATOR_OBSERVER_COLOR] : [],
      );
    };

    return html`
      <div class=${classes}>
        <avatar-icon .emoji=${profile.avatar} .color=${color()}> </avatar-icon>
        <div class="content">
          <div class="label">
            ${(profile.name ?? chatMessage.senderId) + ownRepSuffix}
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
    const reserveColor = this.reserveMediatorColor;
    // An explicit override (e.g. a representative whose color must match its
    // participant) wins; otherwise mediators are blue in observer experiments,
    // falling back to an id hash color.
    const avatarColor =
      this.colorOverride ||
      (reserveColor
        ? MEDIATOR_OBSERVER_COLOR
        : getHashBasedColor(chatMessage.senderId ?? ''));

    return html`
      <div class="chat-message">
        <avatar-icon .emoji=${profile.avatar} .color=${avatarColor}>
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
            ? html`<div
                class="chat-bubble ${reserveColor && !this.colorOverride
                  ? 'mediator-bubble'
                  : ''}"
              >
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
      (file) =>
        html`<media-preview
          .file=${file}
          @maximize=${this.handleMaximize}
        ></media-preview>`,
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
