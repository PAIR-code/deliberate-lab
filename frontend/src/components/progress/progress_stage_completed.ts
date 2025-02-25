import '../../pair-components/tooltip';
import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {ParticipantProfile} from '@deliberation-lab/utils';

import {styles} from './progress_stage_completed.scss';

/** Progress component: Shows how many participants have completed the stage */
@customElement('progress-stage-completed')
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    const stageId = this.participantService.currentStageViewId ?? '';
    const completed = this.cohortService.getStageCompletedParticipants(stageId);

    return html`
      ${this.renderParticipants(completed)}
      <div class="status">
        ${completed.length} of
        ${this.cohortService.nonObsoleteParticipants.length} participants
        completed this stage
      </div>
    `;
  }

  private renderParticipant(participant: ParticipantProfile) {
    const stageId = this.participantService.currentStageViewId ?? '';

    return html`
      <participant-profile-display
        class="participant"
        .profile=${participant}
        .stageId=${stageId}
        displayType="progress"
      >
      </participant-profile-display>
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
    'progress-stage-completed': Progress;
  }
}
