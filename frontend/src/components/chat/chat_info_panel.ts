import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../participant_profile/avatar_icon';
import '../participant_profile/profile_display';
import '../stages/stage_description';
import '../stages/stage_footer';

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
  convertUnifiedTimestampToTime,
} from '@deliberation-lab/utils';
import {
  getChatStartTimestamp,
  getChatTimeRemainingInSeconds,
} from '../../shared/stage.utils';
import {getHashBasedColor} from '../../shared/utils';
import {styles} from './chat_info_panel.scss';

/** Chat panel view with stage info, timer, participants. */
@customElement('chat-info-panel')
export class ChatPanel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentManager = core.getService(AgentManager);
  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: ChatStageConfig | null = null;
  @property({type: Boolean}) topLayout = false;
  @state() isStatusLoading = false;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    if (this.topLayout) {
      return html`
        <div class="top-layout">${this.renderParticipantList(true)}</div>
      `;
    }

    return html`
      <div class="side-layout">
        <stage-description .stage=${this.stage} noPadding> </stage-description>
        ${this.renderTimer(true)} ${this.renderParticipantList()}
      </div>
    `;
  }

  private renderTimer(showDivider = false) {
    if (!this.stage) return nothing;

    const publicStageData = this.cohortService.stagePublicDataMap[
      this.stage.id
    ] as ChatStagePublicData;
    if (!publicStageData || !this.stage.timeLimitInMinutes) return nothing;

    const renderStatus = () => {
      if (!publicStageData.discussionStartTimestamp) {
        return nothing;
      }

      const end = publicStageData.discussionEndTimestamp;
      if (end) {
        return html`(ended at ${convertUnifiedTimestampToTime(end, false)})`;
      }

      const start = getChatStartTimestamp(
        this.stage?.id ?? '',
        this.cohortService.chatMap,
      );
      if (!start) return nothing;
      return html`(started at ${convertUnifiedTimestampToTime(start, false)})`;
    };

    return html`
      <div
        class=${`countdown ${publicStageData.discussionEndTimestamp ? 'ended' : ''}`}
      >
        ${this.stage.timeLimitInMinutes} min chat ${renderStatus()}
      </div>
      ${this.topLayout ? nothing : html`<div class="divider"></div>`}
    `;
  }

  private renderParticipantList(topLayout = false) {
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
          <div>
            Participants (${activeParticipants.length + mediators.length})
          </div>
          ${topLayout ? this.renderTimer() : nothing}
        </div>
        <div class="panel-list ${topLayout ? 'wrap' : ''}">
          ${activeParticipants.map((participant) =>
            this.renderProfile(participant, topLayout),
          )}
          ${mediators.map((mediator) =>
            this.renderMediator(mediator, topLayout),
          )}
        </div>
      </div>
    `;
  }

  private renderMediator(profile: MediatorProfile, small = false) {
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
          .color=${getHashBasedColor(profile.id ?? '')}
          displayType=${small ? 'chatSmall' : 'chat'}
        >
        </profile-display>
        ${renderStatus()} ${renderPause()}
      </div>
    `;
  }

  private renderProfile(profile: ParticipantProfile, small = false) {
    const isCurrent =
      profile.publicId === this.participantService.profile?.publicId;
    return html`
      <participant-profile-display
        .profile=${profile}
        .showIsSelf=${isCurrent}
        displayType=${small ? 'chatSmall' : 'chat'}
      >
      </participant-profile-display>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-info-panel': ChatPanel;
  }
}
