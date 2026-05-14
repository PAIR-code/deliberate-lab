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
import {getHashBasedColor, getProfileBasedColor} from '../../shared/utils';

/** Chat interface component */
@customElement('chat-interface')
export class ChatInterface extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly authService = core.getService(AuthService);

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

    const data = this.stagePublicData;
    // If turn-based but public data is not loaded yet, lock the input to prevent race conditions
    if (!data || !data.currentTurnParticipantId) return false;

    // AI Agents cannot speak inside the browser UI
    if (this.participantService.profile?.agentConfig) return false;

    return (
      data.currentTurnParticipantId ===
      this.participantService.profile?.publicId
    );
  }

  @computed get currentTurnName() {
    const data = this.stagePublicData;
    if (!data || !data.currentTurnParticipantId) return '';

    const participantProfile =
      this.cohortService.participantMap[data.currentTurnParticipantId];
    if (participantProfile && participantProfile.name)
      return participantProfile.name;

    const mediatorProfile =
      this.cohortService.mediatorMap[data.currentTurnParticipantId];
    if (mediatorProfile && mediatorProfile.name) return mediatorProfile.name;

    return data.currentTurnParticipantId;
  }

  @computed get currentTurnProfile() {
    const data = this.stagePublicData;
    if (!data || !data.currentTurnParticipantId) return null;

    const participantProfile =
      this.cohortService.participantMap[data.currentTurnParticipantId];
    if (participantProfile && participantProfile.name) {
      return {
        name: participantProfile.name,
        avatar: participantProfile.avatar,
        isMediator: false,
        id: data.currentTurnParticipantId,
      };
    }

    const mediatorProfile =
      this.cohortService.mediatorMap[data.currentTurnParticipantId];
    if (mediatorProfile && mediatorProfile.name) {
      return {
        name: mediatorProfile.name,
        avatar: mediatorProfile.avatar ?? '🤖',
        isMediator: true,
        id: data.currentTurnParticipantId,
      };
    }

    return {
      name: data.currentTurnParticipantId,
      avatar: '👤',
      isMediator: false,
      id: data.currentTurnParticipantId,
    };
  }

  private renderTypingIndicator() {
    if (this.stage?.kind !== StageKind.CHAT) return nothing;
    const stage = this.stage as ChatStageConfig;
    if (!stage.isTurnBased) return nothing;

    // Do not show typing indicator if it is the current user's turn (they type in the textarea instead!)
    if (this.isMyTurn) return nothing;

    const profile = this.currentTurnProfile;
    if (!profile) return nothing;

    const color = profile.isMediator
      ? getHashBasedColor(profile.id)
      : getProfileBasedColor(profile.id, profile.avatar ?? '');

    return html`
      <div class="chat-message typing-msg">
        <avatar-icon .emoji=${profile.avatar} .color=${color}> </avatar-icon>
        <div class="content">
          <div class="label">${profile.name}</div>
          <div class="chat-bubble typing-bubble">
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
              ></chat-input>`}
        </div>
      </div>
    `;
  }

  private renderTurnBanner() {
    if (this.stage?.kind !== StageKind.CHAT) return nothing;
    const stage = this.stage as ChatStageConfig;
    if (!stage.isTurnBased) return nothing;

    const isMyTurn = this.isMyTurn;

    if (isMyTurn) {
      return html` <div class="banner success">It's your turn to speak!</div> `;
    }

    const currentSpeaker = this.currentTurnName;
    if (!currentSpeaker) return nothing;

    return html`
      <div class="banner warning">
        Waiting for <strong>${currentSpeaker}</strong> to speak...
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-interface': ChatInterface;
  }
}
