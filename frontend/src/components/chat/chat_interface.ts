import '../chat/chat_info_panel';
import '../chat/chat_input';
import '../chat/chat_message';

import {MobxLitElement} from '@adobe/lit-mobx';
import {computed} from 'mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {
  ChatStageConfig,
  ChatStagePublicData,
  PrivateChatStageConfig,
  StageConfig,
  StageKind,
  UserType,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {styles} from './chat_interface.scss';
import {
  getHashBasedColor,
  getProfileBasedColor,
  variableAssignmentsIncludeObserver,
  MEDIATOR_OBSERVER_COLOR,
} from '../../shared/utils';

/** Chat interface component */
@customElement('chat-interface')
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly authService = core.getService(AuthService);

  // When the experiment assigns the `_isObserver` treatment variable, the
  // mediator is shown in blue (avatar, bubble, and typing indicator) and blue
  // is reserved away from other speakers.
  private get reserveMediatorColor(): boolean {
    return variableAssignmentsIncludeObserver(
      this.cohortService.activeParticipants,
    );
  }

  @property({type: Object}) stage: StageConfig | undefined = undefined;
  @property({type: Boolean}) showPanel = false;
  @property({type: Boolean}) showInput = true;
  @property({type: Boolean}) disableInput = false;
  // For a representative-conducted private chat: the rep's display identity
  // (name, avatar, the observer's color) so the representative shows
  // consistently before/after its first message and matches the group chat.
  @property({type: Object}) repPrivateChatProfile: {
    name: string;
    avatar: string;
    color: string;
  } | null = null;
  // Set by a parent view (e.g. the private chat) that has its own notion of
  // when the conversation is over, such as a response timeout the turn
  // indicator here cannot see. When true, the turn banner and typing
  // indicator hide so they do not contradict a conversation-ended message.
  @property({type: Boolean}) externalConversationOver = false;

  // Tracks inner width of window
  @state() mobileView = false;

  private updateResponsiveState = () => {
    this.mobileView = window.innerWidth <= 1024;
  };

  connectedCallback() {
    super.connectedCallback();
    this.updateResponsiveState();
    window.addEventListener('resize', this.updateResponsiveState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.updateResponsiveState);
  }

  private renderPanel() {
    if (!this.stage) return nothing;
    return html`
      <chat-info-panel .stage=${this.stage} .topLayout=${this.mobileView}>
      </chat-info-panel>
    `;
  }

  @computed get stagePublicData() {
    if (!this.stage || this.stage.kind !== StageKind.CHAT) return null;
    return this.cohortService.stagePublicDataMap[this.stage.id] as
      | ChatStagePublicData
      | undefined;
  }

  @computed get isMyTurn() {
    if (!this.stage) return true;
    if (this.stage.kind === StageKind.PRIVATE_CHAT) {
      const config = this.stage as PrivateChatStageConfig;
      if (!config.isTurnBasedChatGroupStyle) return true;
      return this.turnIndicatorState?.isMyTurn ?? false;
    }
    if (this.stage.kind !== StageKind.CHAT) return true;
    const config = this.stage as ChatStageConfig;
    if (!config.isTurnBased) return true;

    return this.turnIndicatorState?.isMyTurn ?? false;
  }

  @computed get turnIndicatorState() {
    if (!this.stage) return null;
    if (this.stage.kind === StageKind.PRIVATE_CHAT) {
      return this.privateChatTurnIndicatorState;
    }
    if (this.stage.kind !== StageKind.CHAT) return null;
    const config = this.stage as ChatStageConfig;
    if (!config.isTurnBased) return null;

    const data = this.stagePublicData;
    if (!data || !data.currentTurnParticipantId) return null;

    // If the latest message is already from the current turn holder, the
    // backend has not advanced the turn yet. Hide the turn indicator so the
    // holder's input stays disabled (the placeholder banner keeps the layout
    // steady) until the turn switches to the next holder all at once.
    const messages = this.cohortService.chatMap[this.stage.id] ?? [];
    const latest = messages[messages.length - 1];
    if (latest?.senderId === data.currentTurnParticipantId) return null;

    return this.buildGroupChatTurnState(data.currentTurnParticipantId);
  }

  private buildGroupChatTurnState(id: string) {
    const isMyTurn =
      !this.participantService.profile?.agentConfig &&
      id === this.participantService.profile?.publicId;

    const participantProfile = this.cohortService.participantMap[id];
    if (participantProfile && participantProfile.name) {
      return {
        name: participantProfile.name,
        avatar: participantProfile.avatar,
        isMediator: false,
        id,
        isMyTurn,
      };
    }

    const mediatorProfile = this.cohortService.mediatorMap[id];
    if (mediatorProfile && mediatorProfile.name) {
      return {
        name: mediatorProfile.name,
        avatar: mediatorProfile.avatar ?? '🤖',
        isMediator: true,
        id,
        isMyTurn,
      };
    }

    return {
      name: id,
      avatar: '👤',
      isMediator: false,
      id,
      isMyTurn,
    };
  }

  /** Whether the current stage is configured for turn-based interaction. */
  @computed get isTurnBasedMode() {
    if (!this.stage) return false;
    if (this.stage.kind === StageKind.PRIVATE_CHAT) {
      return (
        (this.stage as PrivateChatStageConfig).isTurnBasedChatGroupStyle ??
        false
      );
    }
    if (this.stage.kind === StageKind.CHAT) {
      return (this.stage as ChatStageConfig).isTurnBased ?? false;
    }
    return false;
  }

  @computed private get privateChatTurnIndicatorState() {
    if (!this.stage || this.stage.kind !== StageKind.PRIVATE_CHAT) return null;
    const config = this.stage as PrivateChatStageConfig;
    if (!config.isTurnBasedChatGroupStyle) return null;

    // Private chats have no public turn state, so the turn holder is
    // inferred from the latest message: the mediator speaks first and turns
    // alternate. An error message from the mediator counts as its turn so
    // the participant can retry.
    const messages =
      this.participantService.privateChatMap[this.stage.id] ?? [];
    const publicId = this.participantService.profile?.publicId ?? '';
    const latest = messages[messages.length - 1];
    // Match the group-chat path: agent participants never see "Your turn",
    // since the agent doesn't drive the participant UI's chat input.
    const isMyTurn =
      !this.participantService.profile?.agentConfig &&
      !!latest &&
      latest.senderId !== publicId;

    if (isMyTurn) {
      const profile = this.participantService.profile;
      return {
        name: profile?.name ?? '',
        avatar: profile?.avatar ?? '',
        isMediator: false,
        id: publicId,
        isMyTurn: true,
      };
    }

    const lastMediatorMsg = [...messages]
      .reverse()
      .find((m) => m.type === UserType.MEDIATOR);
    const assignedMediator = this.cohortService.getMediatorsForStage(
      this.stage.id,
    )[0];

    // In a representative-conducted private chat, show the represented
    // participant's identity (and color) consistently, matching the group chat.
    const rep = this.repPrivateChatProfile;
    return {
      name:
        rep?.name ??
        lastMediatorMsg?.profile?.name ??
        assignedMediator?.name ??
        'Mediator',
      avatar:
        rep?.avatar ??
        lastMediatorMsg?.profile?.avatar ??
        assignedMediator?.avatar ??
        '🤖',
      color: rep?.color,
      isMediator: true,
      id: lastMediatorMsg?.senderId ?? assignedMediator?.publicId ?? 'mediator',
      isMyTurn: false,
    };
  }

  // True when the given turn-holder id is the viewing participant or their
  // representative (publicId `${publicId}-agent`), so their typing indicator
  // and name label sit on their own side of the chat, like their messages.
  private isOwnSideTurn(id: string | undefined): boolean {
    const myId = this.participantService.profile?.publicId;
    if (!myId || !id) return false;
    return id === myId || id === `${myId}-agent`;
  }

  @computed get isConversationOver() {
    if (!this.stage) return false;
    if (this.stage.kind === StageKind.PRIVATE_CHAT) {
      const chatMessages =
        this.participantService.privateChatMap[this.stage.id] ?? [];
      const publicId = this.participantService.profile?.publicId ?? '';
      const participantMessageCount = chatMessages.filter(
        (msg) => msg.senderId === publicId && !msg.isError,
      ).length;

      const maxTurns = (this.stage as PrivateChatStageConfig).maxNumberOfTurns;
      const maxTurnsReached =
        maxTurns !== null && participantMessageCount >= maxTurns;

      const isWaitingForResponse =
        chatMessages.length > 0 &&
        chatMessages[chatMessages.length - 1].senderId === publicId;

      const discussionStartTimestamp =
        chatMessages.length > 0 ? chatMessages[0].timestamp : null;
      const elapsedMinutes = discussionStartTimestamp
        ? getTimeElapsed(discussionStartTimestamp, 'm')
        : 0;
      const maxTimeReached =
        this.stage.timeLimitInMinutes !== null &&
        this.stage.timeLimitInMinutes > 0 &&
        elapsedMinutes >= this.stage.timeLimitInMinutes;

      const minTurnsMet =
        participantMessageCount >=
        (this.stage as PrivateChatStageConfig).minNumberOfTurns;

      return (
        (maxTurnsReached && !isWaitingForResponse) ||
        (maxTimeReached && minTurnsMet)
      );
    }

    if (this.stage.kind === StageKind.CHAT) {
      const stageData = this.cohortService.stagePublicDataMap[
        this.stage.id
      ] as ChatStagePublicData;
      if (!stageData) return false;
      if (stageData.discussionEndTimestamp) return true;
      // Use the cap the backend actually enforces (a per-mediator override
      // replaces the stage value), falling back to the stage value. Using the
      // stage value directly would trip early when an override is higher,
      // hiding the banner before the mediator's final message.
      const max =
        stageData.effectiveMaxNumberOfMessages ??
        (this.stage as ChatStageConfig).maxNumberOfMessages;
      if (max != null) {
        const messages = this.cohortService.chatMap[this.stage.id] ?? [];
        const count = messages.filter(
          (m) => m.type !== UserType.SYSTEM && !m.isError,
        ).length;
        if (count >= max) return true;
      }
      return false;
    }

    return false;
  }

  private renderTypingIndicator() {
    if (this.externalConversationOver || this.isConversationOver)
      return nothing;
    const turnState = this.turnIndicatorState;
    if (!turnState) return nothing;

    // Do not show typing indicator if it is the current user's turn (they type in the textarea instead!)
    if (turnState.isMyTurn) return nothing;

    const reserve = this.reserveMediatorColor;
    const repColor = (turnState as {color?: string}).color;
    // The mediator's typing indicator uses the same reserved blue as its
    // avatar/bubble; a representative keeps its assigned color, and other
    // speakers keep their own color (with blue reserved away).
    const useMediatorColor = !repColor && reserve && turnState.isMediator;
    const color =
      repColor ??
      (turnState.isMediator
        ? useMediatorColor
          ? MEDIATOR_OBSERVER_COLOR
          : getHashBasedColor(turnState.id)
        : getProfileBasedColor(
            turnState.id,
            turnState.avatar ?? '',
            reserve ? [MEDIATOR_OBSERVER_COLOR] : [],
          ));

    const ownSide = this.isOwnSideTurn(turnState.id);

    return html`
      <div class="chat-message typing-msg ${ownSide ? 'current-user' : ''}">
        <avatar-icon .emoji=${turnState.avatar} .color=${color}> </avatar-icon>
        <div class="content">
          <div class="label">${turnState.name}</div>
          <div
            class="chat-bubble typing-bubble ${useMediatorColor
              ? 'mediator'
              : ''}"
          >
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.stage) return nothing;
    return html`
      <div class="interface-wrapper ${this.mobileView ? 'vertical' : ''}">
        ${this.showPanel ? this.renderPanel() : nothing}
        <div class="main-content">
          <div class="chat-content">
            ${this.renderTurnBanner()}
            <div class="chat-scroll">
              <div class="chat-history">
                ${this.mobileView
                  ? html`<slot name="mobile-description"></slot>`
                  : nothing}
                <slot></slot>
                ${this.renderTypingIndicator()}
              </div>
            </div>
          </div>
          <slot name="indicators"></slot>
          ${!this.showInput
            ? nothing
            : html`<chat-input
                .stageId=${this.stage?.id ?? ''}
                .isDisabled=${this.disableInput || !this.isMyTurn}
                .isTurnBased=${this.isTurnBasedMode}
              ></chat-input>`}
        </div>
      </div>
    `;
  }

  private renderTurnBanner() {
    if (this.externalConversationOver || this.isConversationOver) {
      // Every turn-based chat (group or private) shows the ended banner as its
      // single end-of-discussion indicator; the duplicate in-chat system message
      // is suppressed for turn-based chats (see group_chat_participant_view).
      // Non-turn-based chats show no banner and keep the system message instead.
      if (this.isTurnBasedMode) {
        return html`
          <div class="banner success">
            The discussion has ended. Please proceed to the next stage.
          </div>
        `;
      }
      return nothing;
    }
    const turnState = this.turnIndicatorState;
    if (!turnState) {
      // Keep an empty banner element in the DOM during transient turn-
      // transitions (e.g., end-of-cycle wraps) so the chat content above
      // does not shift up or down. The placeholder banner reserves the
      // same vertical space as a real banner but renders no visible text.
      if (this.isTurnBasedMode) {
        return html`<div class="banner banner-placeholder">&nbsp;</div>`;
      }
      return nothing;
    }

    if (turnState.isMyTurn) {
      return html` <div class="banner success">It's your turn to speak!</div> `;
    }

    return html`
      <div class="banner warning">
        Waiting for <strong>${turnState.name}</strong> to speak...
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-interface': ChatInterface;
  }
}
