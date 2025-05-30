import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../participant_profile/avatar_icon';
import '../participant_profile/profile_display';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AgentManager} from '../../services/agent.manager';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {
  ChatStageConfig,
  ChatStagePublicData,
  MediatorProfile,
  MediatorStatus,
  ParticipantProfile,
  checkApiKeyExists,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {
  convertUnifiedTimestampToDate,
  getHashBasedColor,
} from '../../shared/utils';
import {styles} from './chat_panel.scss';

/** Chat panel view with stage info, participants. */
@customElement('chat-panel')
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentManager = core.getService(AgentManager);
  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ChatStageConfig | null = null;

  @property({type: Number}) timeRemainingInSeconds: number | null = null;

  @state() intervalId: number | null = null;
  @state() isStatusLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this.startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearTimer();
  }

  private startTimer() {
    this.updateTimeRemaining();
    this.intervalId = window.setInterval(() => {
      this.updateTimeRemaining();
    }, 1000);
  }

  private clearTimer() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateTimeRemaining() {
    const chatStage = this.stage as ChatStageConfig;
    if (!chatStage || !chatStage.timeLimitInMinutes) {
      this.timeRemainingInSeconds = null;
      return;
    }

    let timeRemainingInSeconds = chatStage.timeLimitInMinutes * 60;
    const messages = this.cohortService.chatMap[chatStage.id] ?? [];
    if (messages.length) {
      const timeElapsed = getTimeElapsed(messages[0].timestamp, 's');
      timeRemainingInSeconds -= timeElapsed;
    }

    this.timeRemainingInSeconds =
      timeRemainingInSeconds > 0 ? timeRemainingInSeconds : 0;
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      ${this.renderTimeRemaining()} ${this.renderParticipantList()}
    `;
  }

  private renderTimeRemaining() {
    if (!this.stage || this.stage.timeLimitInMinutes === null) {
      return '';
    }

    const publicStageData = this.cohortService.stagePublicDataMap[
      this.stage.id
    ] as ChatStagePublicData;
    if (!publicStageData || !this.stage.timeLimitInMinutes) return;

    let timerHtml = html``;
    if (publicStageData.discussionEndTimestamp) {
      timerHtml = html`<div class="ended countdown">
        Discussion ended at
        ${convertUnifiedTimestampToDate(
          publicStageData.discussionEndTimestamp,
          false,
        )}.
      </div>`;
    } else if (publicStageData.discussionStartTimestamp) {
      const startText = `Conversation started at: ${convertUnifiedTimestampToDate(
        publicStageData.discussionStartTimestamp,
        false,
      )}`;
      const timeText = `Time remaining: ${this.formatTime(
        this.timeRemainingInSeconds!,
      )}`;
      // TODO: Remove timer in favor of "end conversation" button
      timerHtml = html`<div class="countdown">
        ${startText} (time limit: ${this.stage.timeLimitInMinutes} minutes)
      </div>`;
    }

    return html`
      ${timerHtml}
      <div class="divider"></div>
    `;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
  }

  private renderApiCheck() {
    if (
      !checkApiKeyExists(this.authService.experimenterData) &&
      this.authService.isExperimenter
    ) {
      return html`
        <div class="warning">
          <b>Note:</b> In order for LLM calls to work, you must add an API key
          or server configuration under Experimenter Settings.
        </div>
      `;
    }
    return nothing;
  }

  private renderParticipantList() {
    const activeParticipants = this.cohortService.activeParticipants;
    const mediators = this.cohortService.getMediatorsForStage(
      this.stage?.id ?? '',
    );

    if (!this.stage) {
      return nothing;
    }

    return html`
      <div class="panel-item">
        <div class="panel-item-title">
          Participants (${activeParticipants.length + mediators.length})
        </div>
        ${activeParticipants.map((participant) =>
          this.renderProfile(participant),
        )}
        ${mediators.map((mediator) => this.renderMediator(mediator))}
      </div>
    `;
  }

  private renderMediator(profile: MediatorProfile) {
    const renderStatus = () => {
      if (!this.authService.isDebugMode || !profile.agentConfig) {
        return nothing;
      }
      return html`
        <div class="chip secondary">🤖 ${profile.currentStatus}</div>
      `;
    };

    const toggleStatus = async () => {
      this.isStatusLoading = true;
      await this.agentManager.updateMediatorStatus(
        profile.id,
        profile.currentStatus === MediatorStatus.ACTIVE
          ? MediatorStatus.PAUSED
          : MediatorStatus.ACTIVE,
      );
      this.isStatusLoading = false;
    };

    const renderPause = () => {
      if (!this.authService.isDebugMode || !profile.agentConfig) {
        return nothing;
      }
      return html`
        <pr-icon-button
          ?loading=${this.isStatusLoading}
          variant="default"
          icon=${profile.currentStatus === MediatorStatus.PAUSED
            ? 'play_circle'
            : 'pause'}
          @click=${toggleStatus}
        >
        </pr-icon-button>
      `;
    };

    // TODO: Calculate if mediator is out of messages (maxResponses)
    return html`
      <div class="profile">
        <profile-display
          .profile=${profile}
          .color=${getHashBasedColor(
            profile.agentConfig?.agentId ?? profile.id ?? '',
          )}
          displayType="chat"
        >
        </profile-display>
        ${renderStatus()} ${renderPause()}
      </div>
    `;
  }

  private renderProfile(profile: ParticipantProfile) {
    const isCurrent =
      profile.publicId === this.participantService.profile?.publicId;
    return html`
      <participant-profile-display
        .profile=${profile}
        .showIsSelf=${isCurrent}
        displayType="chat"
      >
      </participant-profile-display>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}
