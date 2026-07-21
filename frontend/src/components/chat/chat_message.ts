import '../../pair-components/icon';
import '../../pair-components/tooltip';

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
import {ParticipantAnswerService} from '../../services/participant.answer';
import {ParticipantService} from '../../services/participant.service';

import {
  ChatMessage,
  ChatMessageReaction,
  StoredFile,
  UserType,
  createChatMessageReply,
  getChatMessageReactors,
} from '@deliberation-lab/utils';
import {
  convertMarkdownToHTML,
  convertUnifiedTimestampToDate,
  getHashBasedColor,
  getProfileBasedColor,
} from '../../shared/utils';

import {styles} from './chat_message.scss';

/** Reactions offered on each chat message, in display order. */
const REACTIONS: {
  reaction: ChatMessageReaction;
  emoji: string;
  label: string;
}[] = [
  {reaction: ChatMessageReaction.HEART, emoji: '❤️', label: 'Heart'},
  {reaction: ChatMessageReaction.THUMBS_UP, emoji: '👍', label: 'Thumbs up'},
];

/** Chat message component */
@customElement('chat-message')
export class ChatMessageComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );
  private readonly participantService = core.getService(ParticipantService);

  @property() chat: ChatMessage | undefined = undefined;
  // Stage that this message belongs to. Replying and reacting are only offered
  // when a stage is given (e.g. not in experimenter previews).
  @property() stageId = '';
  // Whether the stage opted into reactions and replies. When false, no
  // react/reply affordances or reply quotes are shown.
  @property() enableReactionsAndReplies = false;
  private fullscreenElement: HTMLElement | null = null;

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
    if (!this.chat || this.chat.isScratchpadOnly) {
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
          ${this.renderReplyQuote(chatMessage)}
          ${chatMessage.message
            ? html`<div class="chat-bubble">
                ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
              </div>`
            : nothing}
          ${this.renderDebuggingInfo(chatMessage)}
          ${this.renderFiles(chatMessage.files)}
          ${this.renderMessageActions(chatMessage)}
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
          ${this.renderReplyQuote(chatMessage)}
          ${chatMessage.message
            ? html`<div class="chat-bubble">
                ${unsafeHTML(convertMarkdownToHTML(chatMessage.message))}
              </div>`
            : nothing}
          ${this.renderDebuggingInfo(chatMessage)}
          ${this.renderFiles(chatMessage.files)}
          ${this.renderMessageActions(chatMessage)}
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

  /** Render the quoted message that this message is replying to. */
  private renderReplyQuote(chatMessage: ChatMessage) {
    if (!this.enableReactionsAndReplies) return nothing;
    const replyTo = chatMessage.replyTo;
    if (!replyTo) return nothing;

    return html`
      <div class="reply-quote">
        <div class="reply-author">
          ${replyTo.name.length > 0 ? replyTo.name : replyTo.senderId}
        </div>
        <div class="reply-text">
          ${replyTo.message.length > 0 ? replyTo.message : 'Attachment'}
        </div>
      </div>
    `;
  }

  /** Render reaction counts, plus reply/react buttons for participants. */
  private renderMessageActions(chatMessage: ChatMessage) {
    if (!this.enableReactionsAndReplies) return nothing;
    const publicId = this.participantService.profile?.publicId ?? '';
    // Only a participant viewing a real stage can react or reply. Everyone else
    // (e.g. an experimenter previewing the chat) still sees existing reactions.
    const canReact = Boolean(this.stageId) && Boolean(publicId);
    const isDisabled = this.participantService.disableStage;

    const reactions = REACTIONS.map((config) => {
      const reactors = getChatMessageReactors(chatMessage, config.reaction);
      // Reactions nobody has used are shown only to those who can add them
      if (reactors.length === 0 && !canReact) return nothing;

      const isActive = reactors.includes(publicId);
      const classes = classMap({
        'action-chip': true,
        active: isActive,
        // Chips with no reactions are revealed on hover, so that untouched
        // messages stay visually quiet
        empty: reactors.length === 0,
      });

      return html`
        <pr-tooltip
          text=${this.getReactionTooltip(config.label, reactors)}
          position="TOP_START"
        >
          <button
            class=${classes}
            ?disabled=${!canReact || isDisabled}
            @click=${() =>
              this.participantService.updateChatMessageReaction(
                this.stageId,
                chatMessage.id,
                config.reaction,
                !isActive,
              )}
          >
            <span class="emoji">${config.emoji}</span>
            ${reactors.length > 0
              ? html`<span class="count">${reactors.length}</span>`
              : nothing}
          </button>
        </pr-tooltip>
      `;
    });

    if (!canReact && reactions.every((item) => item === nothing)) {
      return nothing;
    }

    return html`
      <div class="actions">
        ${reactions}
        ${canReact
          ? html`
              <pr-tooltip text="Reply" position="TOP_START">
                <button
                  class="action-chip empty"
                  ?disabled=${isDisabled}
                  @click=${() =>
                    this.participantAnswerService.setChatReply(
                      this.stageId,
                      createChatMessageReply(chatMessage),
                    )}
                >
                  <pr-icon icon="reply" size="small"></pr-icon>
                </button>
              </pr-tooltip>
            `
          : nothing}
      </div>
    `;
  }

  /** Tooltip naming everyone who applied a reaction. */
  private getReactionTooltip(label: string, reactors: string[]) {
    if (reactors.length === 0) return label;

    const names = reactors.map((publicId) => {
      if (publicId === this.participantService.profile?.publicId) return 'You';
      return this.cohortService.participantMap[publicId]?.name ?? publicId;
    });
    return `${label}: ${names.join(', ')}`;
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
