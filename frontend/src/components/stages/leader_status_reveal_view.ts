import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {LRRankingStagePublicData} from '@deliberation-lab/utils';
import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {styles} from './ranking_reveal_view.scss';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';

import {CohortService} from '../../services/cohort.service';

/** Leader selection reveal view */
@customElement('leader-reveal-view')
export class LeaderRevealView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly cohortService = core.getService(CohortService);

  @property() publicData: LRRankingStagePublicData | undefined = undefined;

  override render() {
    if (!this.publicData) return html`<p><em>Waiting for results...</em></p>`;

    const leaderStatusMap = this.publicData.leaderStatusMap || {};
    const winnerId = this.publicData.winnerId || '';
    const participantId = this.participantService.profile?.publicId ?? ''; // ✅ FIXED
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

    // 🔍 Determine whether to show who the leader is
    const showWinner =
      winnerId && participantId !== winnerId && status !== 'waiting';

    // 🔍 Convert winnerId → "Participant 7506"
    let winnerPretty: string | null = null;
    if (showWinner) {
      const winnerProfile = this.cohortService.participantMap?.[winnerId];
      if (winnerProfile) {
        winnerPretty = getParticipantInlineDisplay(winnerProfile); // 👈 magic happens here
      } else {
        winnerPretty = winnerId; // fallback (should rarely happen)
      }
    }

    console.log('[LeaderRevealView] my ID:', participantId);
    console.log('[LeaderRevealView] all keys:', Object.keys(leaderStatusMap));
    console.log(
      '[LeaderRevealView] publicData snapshot:',
      JSON.parse(JSON.stringify(this.publicData)),
    );

    return html`
      <div class="leader-status-block">
        <h3>Leader Selection Result</h3>
        <p>${messages[status] ?? messages.waiting}</p>
        ${showWinner && winnerPretty
          ? html`
              <p style="margin-top: 12px; font-size: 0.95em; opacity: 0.8;">
                ⭐ <strong>${winnerPretty}</strong> was selected as the leader.
              </p>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'leader-reveal-view': LeaderRevealView;
  }
}
