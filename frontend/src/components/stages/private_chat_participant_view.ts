import '../progress/progress_stage_completed';
import '../chat/chat_interface';
import '../chat/chat_message';
import '../participant_profile/avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';

import {
  ChatMessage,
  PrivateChatStageConfig,
  UserType,
} from '@deliberation-lab/utils';
import {getHashBasedColor} from '../../shared/utils';

import {styles} from './group_chat_participant_view.scss';

/** Private chat interface for participants */
@customElement('private-chat-participant-view')
export class PrivateChatView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() stage: PrivateChatStageConfig | undefined = undefined;

  override render() {
    if (!this.stage) return nothing;

    const chatMessages =
      this.participantService.privateChatMap[this.stage.id] ?? [];

    // Count participant messages
    const publicId = this.participantService.profile?.publicId ?? '';
    const participantMessageCount = chatMessages.filter(
      (msg) => msg.senderId === publicId && !msg.isError,
    ).length;

    // Check if we're waiting for a response (last message is from participant)
    const isWaitingForResponse =
      chatMessages.length > 0 &&
      chatMessages[chatMessages.length - 1].senderId === publicId;

    // Check if max number of turns reached (but only after response received)
    const maxTurnsReached =
      this.stage.maxNumberOfTurns !== null &&
      participantMessageCount >= this.stage.maxNumberOfTurns &&
      !isWaitingForResponse;

    // Check if conversation has ended (max turns reached and not waiting for response)
    const isConversationOver = maxTurnsReached;

    // Disable input if turn-taking is set and latest message
    // is from participant OR if conversation is over
    const isDisabledInput = () => {
      if (isConversationOver) {
        return true;
      }
      if (!this.stage?.isTurnBasedChat) {
        return false;
      }
      if (chatMessages.length === 0) {
        return false;
      }
      return isWaitingForResponse;
    };

    // Check if minimum number of turns met for progression
    // For turn-based chats, only count completed turns (where agent has responded)
    const minTurnsMet = this.stage.isTurnBasedChat
      ? participantMessageCount >= this.stage.minNumberOfTurns &&
        !isWaitingForResponse
      : participantMessageCount >= this.stage.minNumberOfTurns;

    return html`
      <chat-interface .stage=${this.stage} .disableInput=${isDisabledInput()}>
        ${chatMessages.map((message) => this.renderChatMessage(message))}
        ${isWaitingForResponse && !isConversationOver
          ? this.renderAgentIndicator(chatMessages)
          : nothing}
        ${isConversationOver ? this.renderConversationEndedMessage() : nothing}
      </chat-interface>
      <stage-footer .disabled=${!minTurnsMet}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
        ${!minTurnsMet && !isConversationOver
          ? this.renderMinTurnsMessage(participantMessageCount)
          : nothing}
      </stage-footer>
    `;
  }

  private renderAgentIndicator(chatMessages: ChatMessage[]) {
    // Get avatar/color from last mediator message
    const lastMediator = [...chatMessages]
      .reverse()
      .find((msg) => msg.type === UserType.MEDIATOR);
    const avatar = lastMediator?.profile?.avatar;
    const color = lastMediator
      ? getHashBasedColor(lastMediator.senderId ?? '')
      : undefined;

    const renderCancelButton = () => {
      if (this.stage?.preventCancellation) return nothing;
      return html`
        <pr-tooltip text="Cancel">
          <pr-icon-button
            icon="stop_circle"
            color="neutral"
            variant="default"
            @click=${() =>
              this.participantService.sendErrorChatMessage({
                message: 'Request canceled',
              })}
          >
          </pr-icon-button>
        </pr-tooltip>
      `;
    };

    return html`
      <div class="typing-indicator">
        <div class="avatar-spinner-wrapper">
          ${avatar
            ? html`<avatar-icon .emoji=${avatar} .color=${color}></avatar-icon>`
            : nothing}
          <div class="spinner"></div>
        </div>
        ${renderCancelButton()}
      </div>
    `;
  }

  private renderChatMessage(chatMessage: ChatMessage) {
    if (chatMessage.isError) {
      return html`<div class="description error">${chatMessage.message}</div>`;
    }
    return html`<chat-message .chat=${chatMessage}></chat-message>`;
  }

  private renderConversationEndedMessage() {
    return html`
      <div class="description">
        The conversation has ended. Please proceed to the next stage.
      </div>
    `;
  }

  private renderMinTurnsMessage(currentCount: number) {
    const remaining = this.stage!.minNumberOfTurns - currentCount;
    return html`
      <div class="description">
        Please send at least ${remaining} more
        message${remaining === 1 ? '' : 's'} before proceeding.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'private-chat-participant-view': PrivateChatView;
  }
}
