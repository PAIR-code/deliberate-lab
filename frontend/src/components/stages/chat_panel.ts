import '../../pair-components/tooltip';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {
  ChatStageConfig,
  ChatStagePublicData,
  AgentConfig,
  ParticipantProfile,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {isActiveParticipant} from '../../shared/participant.utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';
import {styles} from './chat_panel.scss';

/** Chat panel view with stage info, participants. */
@customElement('chat-panel')
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ChatStageConfig | null = null;

  @property({type: Number}) timeRemainingInSeconds: number | null = null;
  private intervalId: number | null = null;
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
          false
        )}.
      </div>`;
    } else if (!publicStageData.discussionStartTimestamp) {
      const timeText = `Time remaining: ${this.formatTime(
        this.stage.timeLimitInMinutes * 60
      )}`;
      timerHtml = html`<div class="countdown">${timeText}</div>`;
    } else {
      const startText = `Conversation started at: ${convertUnifiedTimestampToDate(
        publicStageData.discussionStartTimestamp,
        false
      )}`;
      const timeText = `Time remaining: ${this.formatTime(
        this.timeRemainingInSeconds!
      )}`;
      timerHtml = html`<div class="countdown">
        ${startText}<br />${timeText}
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
    if (!this.authService.experimenterData?.apiKeys.geminiKey) {
      return html`
        <div class="warning">
          <b>Note:</b> In order for LLM calls to work, you must add your Gemini
          API key under Settings.
        </div>
      `;
    }
    return '';
  }

  private renderParticipantList() {
    const activeParticipants = this.cohortService.activeParticipants;

    if (!this.stage) {
      return nothing;
    }

    const agents = this.stage.agents;
    if (agents && agents.length === 0) {
    }

    return html`
      <div class="panel-item">
        <div class="panel-item-title">
          Participants (${activeParticipants.length + agents.length})
        </div>
        ${agents && agents.length > 0 ? this.renderApiCheck() : ''}
        ${activeParticipants.map((participant) =>
          this.renderProfile(participant)
        )}
        ${agents.map((agent) => this.renderAgent(agent))}
      </div>
    `;
  }

  private renderAgent(agent: AgentConfig) {
    return html`
      <pr-tooltip
        text=${this.authService.isDebugMode ? agent.prompt : ''}
        position="BOTTOM_END"
      >
        <div class="profile">
          <profile-avatar .emoji=${agent.avatar}></profile-avatar>
          <div class="name">
            ${agent.name}${this.authService.isDebugMode ? ` 🤖` : ''}
          </div>
        </div>
      </pr-tooltip>
    `;
  }

  private renderProfile(profile: ParticipantProfile) {
    return html`
      <div class="profile">
        <profile-avatar
          .emoji=${profile.avatar}
          ?disabled=${isActiveParticipant(profile)}
        >
        </profile-avatar>
        <div class="name">
          ${profile.name ? profile.name : profile.publicId}
          ${profile.pronouns ? `(${profile.pronouns})` : ''}
          ${profile.publicId === this.participantService.profile?.publicId
            ? `(you)`
            : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}
