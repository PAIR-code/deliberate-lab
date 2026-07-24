import '../progress/progress_stage_completed';
import '../chat/chat_interface';
import '../chat/chat_message';
import '../participant_profile/avatar_icon';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {CohortService} from '../../services/cohort.service';

import {
  ChatMessage,
  PrivateChatStageConfig,
  StageKind,
  TransferStageConfig,
  UserType,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {
  getHashBasedColor,
  getProfileBasedColor,
  MEDIATOR_OBSERVER_COLOR,
  variableAssignmentsIncludeObserver,
} from '../../shared/utils';
import {ResponseTimeoutTracker} from '../../shared/response_timeout';

import {styles} from './group_chat_participant_view.scss';

/** Private chat interface for participants */
@customElement('private-chat-participant-view')
export class PrivateChatView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);

  @property() stage: PrivateChatStageConfig | undefined = undefined;

  // After this timeout, stop showing the spinner and re-enable input
  // so the participant can send another message if the backend failed silently.
  private static readonly RESPONSE_TIMEOUT_S = 120;
  private readonly responseTimeout = new ResponseTimeoutTracker(
    PrivateChatView.RESPONSE_TIMEOUT_S,
    () => {
      this.requestUpdate();
    },
  );

  override updated() {
    const chatMessages =
      this.participantService.privateChatMap[this.stage?.id ?? ''] ?? [];
    const publicId = this.participantService.profile?.publicId ?? '';
    const lastMessage =
      chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
    const lastMessageIsFromParticipant =
      lastMessage !== null && lastMessage.senderId === publicId;

    const sentAtSeconds = lastMessage?.timestamp?.seconds ?? null;
    this.responseTimeout.update(
      lastMessage?.id ?? null,
      lastMessageIsFromParticipant,
      sentAtSeconds,
    );
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.responseTimeout.clear();
  }

  override render() {
    if (!this.stage) return nothing;

    const chatMessages =
      this.participantService.privateChatMap[this.stage.id] ?? [];

    // Count participant messages
    const publicId = this.participantService.profile?.publicId ?? '';
    const participantMessageCount = chatMessages.filter(
      (msg) => msg.senderId === publicId && !msg.isError,
    ).length;

    // Check if we're waiting for a response (last message is from participant
    // and we haven't timed out waiting)
    const isWaitingForResponse =
      chatMessages.length > 0 &&
      chatMessages[chatMessages.length - 1].senderId === publicId &&
      !this.responseTimeout.timedOut;

    // Check if max number of turns reached
    const maxTurnsReached =
      this.stage.maxNumberOfTurns !== null &&
      participantMessageCount >= this.stage.maxNumberOfTurns;

    const discussionStartTimestamp =
      chatMessages.length > 0 ? chatMessages[0].timestamp : null;
    const elapsedMinutes = discussionStartTimestamp
      ? getTimeElapsed(discussionStartTimestamp, 'm')
      : 0;

    const maxTimeReached =
      this.stage.timeLimitInMinutes !== null &&
      this.stage.timeLimitInMinutes > 0 &&
      elapsedMinutes >= this.stage.timeLimitInMinutes;

    // Check if minimum number of turns met for progression.
    // Both turn-based variants (text turn-taking and banner-style turn-taking)
    // alternate participant and mediator, so the participant's last turn isn't
    // complete until the mediator has responded. Otherwise the "Next stage"
    // button can appear while the mediator is still composing its final message.
    const isTurnBased =
      this.stage.isTurnBasedChat || this.stage.isTurnBasedChatGroupStyle;
    const minTurnsMet = isTurnBased
      ? participantMessageCount >= this.stage.minNumberOfTurns &&
        !isWaitingForResponse
      : participantMessageCount >= this.stage.minNumberOfTurns;

    // Check if conversation has ended
    // Min turns takes precedence: conversation stays open until min turns is met,
    // even if max time has elapsed.
    const isConversationOver =
      (maxTurnsReached && !isWaitingForResponse) ||
      (maxTimeReached && minTurnsMet);

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

    // Check if minimum time is met
    const minTimeMet =
      this.stage.timeMinimumInMinutes == null ||
      this.stage.timeMinimumInMinutes <= 0 ||
      (discussionStartTimestamp !== null &&
        elapsedMinutes >= this.stage.timeMinimumInMinutes);

    const isNextDisabled = !minTurnsMet || !minTimeMet;

    return html`
      <chat-interface
        .stage=${this.stage}
        .disableInput=${isDisabledInput()}
        .repPrivateChatProfile=${this.repPrivateChatProfile}
        .externalConversationOver=${isConversationOver}
      >
        ${chatMessages.map((message) => this.renderChatMessage(message))}
        ${isWaitingForResponse &&
        !isConversationOver &&
        !this.stage.isTurnBasedChatGroupStyle
          ? this.renderAgentIndicator(chatMessages)
          : nothing}
        ${isConversationOver &&
        minTimeMet &&
        !this.stage.isTurnBasedChatGroupStyle
          ? this.renderConversationEndedMessage()
          : nothing}
        ${isConversationOver && !minTimeMet
          ? this.renderWaitingForMinTimeMessage(elapsedMinutes)
          : nothing}
      </chat-interface>
      <stage-footer .disabled=${isNextDisabled}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
        ${!minTurnsMet && !isConversationOver
          ? this.renderMinTurnsMessage(participantMessageCount, maxTimeReached)
          : nothing}
        ${!minTimeMet && minTurnsMet
          ? this.renderMinTimeMessage(elapsedMinutes)
          : nothing}
      </stage-footer>
    `;
  }

  /**
   * If this private chat is conducted by the participant's
   * representative (a `_hasRepresentative` round), returns the
   * representative's display name, avatar, and color, so it shows consistently
   * before and after its first message and matches the group chat. Returns
   * null otherwise.
   */
  private get repPrivateChatProfile(): {
    name: string;
    avatar: string;
    color: string;
  } | null {
    const profile = this.participantService.profile;
    if (!profile || !this.stage) return null;
    const stages = this.experimentService.stages;
    const idx = stages.findIndex((s) => s.id === this.stage?.id);
    if (idx < 0) return null;
    // The round is identified by the next transfer's treatmentIndex.
    let treatmentIndex: number | null = null;
    for (let i = idx + 1; i < stages.length; i++) {
      const s = stages[i];
      if (s.kind === StageKind.TRANSFER) {
        const ti = (s as TransferStageConfig).treatmentIndex;
        treatmentIndex = typeof ti === 'number' ? ti : null;
        break;
      }
      if (s.kind === StageKind.PRIVATE_CHAT) return null;
    }
    if (treatmentIndex === null) return null;
    if (!this.roundHasRepresentative(profile.variableMap, treatmentIndex)) {
      return null;
    }
    return {
      name: `${profile.name ?? profile.publicId}'s Agent (yours)`,
      avatar: '🤖',
      // Colour the representative from its own robot avatar, not the observer's
      // (possibly gendered) avatar, so it matches the group-chat representative
      // and is never given a mediator/gendered colour.
      color: getProfileBasedColor(
        profile.publicId ?? '',
        '🤖',
        variableAssignmentsIncludeObserver(
          this.cohortService.activeParticipants,
        )
          ? [MEDIATOR_OBSERVER_COLOR]
          : [],
      ),
    };
  }

  /** True if the treatment selected for `index` sets `_hasRepresentative`. */
  private roundHasRepresentative(
    variableMap: Record<string, string> | undefined,
    index: number,
  ): boolean {
    if (!variableMap) return false;
    for (const [name, value] of Object.entries(variableMap)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        continue;
      }
      let treatment: unknown;
      if (Array.isArray(parsed)) {
        treatment = parsed[index];
      } else if (parsed && typeof parsed === 'object') {
        const suffix = name.match(/_(\d+)$/);
        if (suffix && Number(suffix[1]) !== index + 1) continue;
        treatment = parsed;
      } else {
        continue;
      }
      if (
        treatment &&
        typeof treatment === 'object' &&
        (treatment as Record<string, unknown>)._hasRepresentative === true
      ) {
        return true;
      }
    }
    return false;
  }

  private renderAgentIndicator(chatMessages: ChatMessage[]) {
    const lastMediatorMsg = [...chatMessages]
      .reverse()
      .find((msg) => msg.type === UserType.MEDIATOR);
    const assignedMediator = this.cohortService.getMediatorsForStage(
      this.stage?.id ?? '',
    )[0];

    const rep = this.repPrivateChatProfile;
    const avatar =
      rep?.avatar ??
      lastMediatorMsg?.profile?.avatar ??
      assignedMediator?.avatar;
    const colorKey =
      lastMediatorMsg?.senderId ?? assignedMediator?.publicId ?? '';
    const color =
      rep?.color ?? (colorKey ? getHashBasedColor(colorKey) : undefined);

    const renderCancelButton = () => {
      if (this.stage?.preventCancellation) {
        return nothing;
      }
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
    // In a representative-conducted chat, the observer sees their
    // representative marked "(yours)"; the stored profile name carries no
    // suffix.
    const rep = this.repPrivateChatProfile;
    const chat =
      rep && chatMessage.type === UserType.MEDIATOR
        ? {
            ...chatMessage,
            profile: {
              ...chatMessage.profile,
              name: `${chatMessage.profile.name} (yours)`,
            },
          }
        : chatMessage;
    return html`<chat-message
      .chat=${chat}
      .colorOverride=${rep?.color ?? ''}
    ></chat-message>`;
  }

  private renderConversationEndedMessage() {
    return html`
      <div class="description">
        The conversation has ended. Please proceed to the next stage.
      </div>
    `;
  }

  private renderWaitingForMinTimeMessage(elapsedMinutes: number) {
    const remaining = Math.ceil(
      (this.stage?.timeMinimumInMinutes ?? 0) - elapsedMinutes,
    );
    return html`
      <div class="description">
        The conversation has ended. Please wait ${remaining} more
        minute${remaining !== 1 ? 's' : ''} before proceeding.
      </div>
    `;
  }

  private renderMinTurnsMessage(currentCount: number, maxTimeReached: boolean) {
    const remaining = this.stage!.minNumberOfTurns - currentCount;
    if (remaining <= 0) return nothing;
    return html`
      <div class="description">
        ${maxTimeReached ? 'Time is up, but please' : 'Please'} send at least
        ${remaining} more message${remaining === 1 ? '' : 's'} before
        proceeding.
      </div>
    `;
  }

  private renderMinTimeMessage(elapsedMinutes: number) {
    const remaining = Math.ceil(
      (this.stage?.timeMinimumInMinutes ?? 0) - elapsedMinutes,
    );
    return html`
      <div class="description">
        You must stay in this chat for at least ${remaining} more
        minute${remaining !== 1 ? 's' : ''}.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'private-chat-participant-view': PrivateChatView;
  }
}
