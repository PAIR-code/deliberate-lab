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
  StageConfig,
  StageKind,
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
    if (!this.stage || this.stage.kind !== StageKind.CHAT) return true;
    const config = this.stage as ChatStageConfig;
    if (!config.isTurnBased) return true;

    return this.turnIndicatorState?.isMyTurn ?? false;
  }

  @computed get turnIndicatorState() {
    if (!this.stage || this.stage.kind !== StageKind.CHAT) return null;
    const config = this.stage as ChatStageConfig;
    if (!config.isTurnBased) return null;

    const data = this.stagePublicData;
    if (!data || !data.currentTurnParticipantId) return null;

    const id = data.currentTurnParticipantId;

    // If the latest message is already from the current turn holder, the
    // backend trigger hasn't advanced the turn yet — hide the indicator to
    // avoid a stale "Waiting for X" flash immediately after X just spoke.
    const messages = this.cohortService.chatMap[this.stage.id] ?? [];
    const latest = messages[messages.length - 1];
    if (latest?.senderId === id) return null;

    const isMyTurn =
      !this.participantService.profile?.agentConfig &&
      id === this.participantService.profile?.publicId;

    const participantProfile =
      this.cohortService.participantMap[data.currentTurnParticipantId];
    if (participantProfile && participantProfile.name) {
      return {
        name: participantProfile.name,
        avatar: participantProfile.avatar,
        isMediator: false,
        id,
        isMyTurn,
      };
    }

    const mediatorProfile =
      this.cohortService.mediatorMap[data.currentTurnParticipantId];
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

  // True when the given turn-holder id is the viewing participant or their
  // representative (publicId `${publicId}-agent`), so their typing indicator
  // and name label sit on their own side of the chat, like their messages.
  private isOwnSideTurn(id: string | undefined): boolean {
    const myId = this.participantService.profile?.publicId;
    if (!myId || !id) return false;
    return id === myId || id === `${myId}-agent`;
  }

  private renderTypingIndicator() {
    const turnState = this.turnIndicatorState;
    if (!turnState) return nothing;

    // Do not show typing indicator if it is the current user's turn (they type in the textarea instead!)
    if (turnState.isMyTurn) return nothing;

    const reserve = this.reserveMediatorColor;
    // The mediator's typing indicator uses the same reserved blue as its
    // avatar/bubble; other speakers keep their own color (with blue reserved
    // away).
    const useMediatorColor = reserve && turnState.isMediator;
    const color = turnState.isMediator
      ? useMediatorColor
        ? MEDIATOR_OBSERVER_COLOR
        : getHashBasedColor(turnState.id)
      : getProfileBasedColor(
          turnState.id,
          turnState.avatar ?? '',
          reserve ? [MEDIATOR_OBSERVER_COLOR] : [],
        );

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
    const turnState = this.turnIndicatorState;
    if (!turnState) return nothing;

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
