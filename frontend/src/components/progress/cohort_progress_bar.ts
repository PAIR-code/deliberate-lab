import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {ParticipantProfile} from '@deliberation-lab/utils';
import {getCohortParticipants} from '../../shared/cohort.utils';
import {
  isObsoleteParticipant,
  isSuccessParticipant,
  isParticipantEndedExperiment,
} from '../../shared/participant.utils';

import {styles} from './progress_bar.scss';

/** Progress bar for all participants in cohort. */
@customElement('cohort-progress-bar')
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() cohortId: string | undefined = undefined;
  @property() participantList: ParticipantProfile[] = [];

  override render() {
    if (!this.cohortId) return nothing;

    const participants = getCohortParticipants(
      this.participantList,
      this.cohortId,
    );
    const total = participants.length;

    // If ended experiment without completing
    const numObsoleteParticipants = participants.filter((participant) =>
      isObsoleteParticipant(participant),
    ).length;

    // If successfully completed experiment
    const numSuccessParticipants = participants.filter((participant) =>
      isSuccessParticipant(participant),
    ).length;

    // If started experiment but not completed
    const numProgressParticipants = participants.filter(
      (participant) =>
        !isParticipantEndedExperiment(participant) &&
        participant.timestamps.startExperiment,
    ).length;

    return html`
      <pr-tooltip
        text="${numSuccessParticipants} of ${total} participants completed"
        position="RIGHT"
      >
        <div class="progress-bar large">
          <div
            class="progress completed"
            style=${`width: calc(100% * ${numSuccessParticipants / total})`}
          ></div>
          <div
            class="progress in-progress"
            style=${`width: calc(100% * ${numProgressParticipants / total})`}
          ></div>
          <div
            class="progress timeout"
            style=${`width: calc(100% * ${numObsoleteParticipants / total})`}
          ></div>
        </div>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-progress-bar': Progress;
  }
}
