import '../../pair-components/tooltip';
import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {ParticipantProfile} from '@deliberation-lab/utils';

import {styles} from './progress_stage_completed.scss';

/** Progress component: Shows how many participants are ready to end
 * the chat discussion.
 */
@customElement('progress-chat-discussion-completed')
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() discussionId: string | null = null;

  override render() {
    if (!this.discussionId) return nothing;

    const stageId = this.participantService.currentStageViewId ?? '';
    const {completed, notCompleted} =
      this.cohortService.getParticipantsByChatDiscussionCompletion(
        stageId,
        this.discussionId,
      );

    return html`
      ${this.renderParticipants(completed)}
      <div class="status">
        ${completed.length} of ${completed.length + notCompleted.length}
        participants are ready to move on
      </div>
    `;
  }

  private renderParticipant(participant: ParticipantProfile) {
    return html`
      <participant-profile-display
        class="participant"
        .profile=${participant}
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
    'progress-chat-discussion-completed': Progress;
  }
}
