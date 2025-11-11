import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {LRRankingStagePublicData} from '@deliberation-lab/utils';
import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {styles} from './ranking_reveal_view.scss';

/** Leader selection reveal view */
@customElement('leader-reveal-view')
export class LeaderRevealView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);

  @property() publicData: LRRankingStagePublicData | undefined = undefined;

  override render() {
    if (!this.publicData) return html`<p><em>Waiting for results...</em></p>`;

    const leaderStatusMap = this.publicData.leaderStatusMap || {};
    const participantId = this.participantService.participantId ?? '';
    const status = leaderStatusMap[participantId] ?? 'waiting';

    const messages: Record<string, string> = {
      candidate_accepted: '✅ You applied and were selected as leader!',
      candidate_rejected: '❌ You applied but were not selected.',
      non_candidate_accepted:
        '✅ You did not apply, but since no one else did, you were selected!',
      non_candidate_rejected: '❌ You did not apply and were not selected.',
      non_candidate_hypo_selected:
        '💡 You did not apply, but had you done so, you would have been selected.',
      non_candidate_hypo_rejected:
        'ℹ️ You did not apply, and even if you had, you would not have been selected.',
      waiting: '⏳ Waiting for results...',
    };

    return html`
      <div class="leader-status-block">
        <h3>Leader Selection Result</h3>
        <p>${messages[status] ?? messages.waiting}</p>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'leader-reveal-view': LeaderRevealView;
  }
}
