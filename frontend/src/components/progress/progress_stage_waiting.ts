import '../../pair-components/button';
import '../../pair-components/tooltip';
import '../participant_profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {ParticipantProfile} from '@deliberation-lab/utils';
import {
  getParticipantName,
  getParticipantPronouns,
  isActiveParticipant,
} from '../../shared/participant.utils';

import {styles} from './progress_stage_waiting.scss';

/** Display this component if a stage is in a waiting phase. */
@customElement('progress-stage-waiting')
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() showReadyAvatars = true;
  @property() showWaitingAvatars = false;

  @state() completeWaitingLoading = false;

  override render() {
    const stageId = this.routerService.activeRoute.params['stage'];
    const stage = this.experimentService.getStage(stageId);
    if (!stage) return nothing;

    const locked = this.cohortService.getLockedStageParticipants(stageId);
    const unlocked = this.cohortService.getUnlockedStageParticipants(stageId);

    const numWaiting =
      this.cohortService.getWaitingPhaseMinParticipants(stageId) - unlocked.length;

    const completeWaiting = async () => {
      this.completeWaitingLoading = true;

      await this.participantService.updateWaitingPhaseCompletion(stageId);

      this.completeWaitingLoading = false;
    };

    const renderWaitingStatus = () => {
      if (numWaiting === 0) return nothing;

      return html`
        <div class="status">
          <h2 class="secondary">
            <div class="chip secondary">Waiting on</div>
            <div>
              ${numWaiting}
              participant${numWaiting > 1 ? 's' : ''}
            </div>
          </h2>
          ${this.showWaitingAvatars ? this.renderParticipants(locked) : nothing}
        </div>
        <div class="divider"></div>
      `;
    };

    return html`
      ${renderWaitingStatus()}
      <div class="status">
        <h2 class="secondary">
          <div class="chip secondary">Ready</div>
          <div>${unlocked.length} participants</div>
        </h2>
        ${this.showReadyAvatars ? this.renderParticipants(unlocked) : nothing}
      </div>
      <pr-tooltip
        text=${numWaiting > 0 ? 'Still waiting on participants' : ''}
        position="BOTTOM_START"
      >
        <pr-button
          color=${numWaiting > 0 ? 'neutral' : 'primary'}
          ?disabled=${numWaiting > 0}
          ?loading=${this.completeWaitingLoading}
          @click=${completeWaiting}
        >
          Continue to stage
        </pr-button>
      </pr-tooltip>
    `;
  }

  private renderParticipant(participant: ParticipantProfile) {
    const isDisabled = !isActiveParticipant(participant);

    const participantName = getParticipantName(participant);
    const isTruncated = participantName.length > 14;
    const displayName = isTruncated
      ? participantName.substring(0, 11) + '...'
      : participantName;

    let tooltipText = '';
    if (isTruncated && isDisabled) {
      tooltipText = `${participantName} is no longer in the experiment`;
    } else if (isTruncated) {
      tooltipText = participantName;
    } else if (isDisabled) {
      tooltipText = 'This participant is no longer in the experiment';
    }

    return html`
      <pr-tooltip text=${tooltipText} position="BOTTOM_END">
        <div class="participant">
          <profile-avatar
            .emoji=${participant.avatar}
            .disabled=${isDisabled}
          ></profile-avatar>
          <div>${displayName} ${getParticipantPronouns(participant)}</div>
        </div>
      </pr-tooltip>
    `;
  }

  private renderParticipants(participants: ParticipantProfile[]) {
    return html`
      <div class="participants-wrapper">
        ${participants.map((p) => this.renderParticipant(p))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'progress-stage-waiting': Progress;
  }
}
