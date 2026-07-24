import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {css} from 'lit';

import {NegotiationPayoutStageConfig} from '@deliberation-lab/utils';
import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

/** Negotiation payout summary stage view for participants. */
@customElement('negotiation-payout-participant-view')
export class NegotiationPayoutParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [
    css`
      :host {
        display: block;
      }
      .payout-card {
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 24px;
        margin-top: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      .payout-header {
        font-size: 20px;
        font-weight: 600;
        color: #202124;
        margin-bottom: 16px;
        border-bottom: 2px solid #1a73e8;
        padding-bottom: 8px;
      }
      .payout-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
        margin-bottom: 16px;
      }
      .payout-table th,
      .payout-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }
      .payout-table th {
        background: #f8f9fa;
        color: #5f6368;
        font-weight: 600;
      }
      .party-tag {
        font-weight: 600;
        color: #1a73e8;
      }
      .status-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 16px;
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 16px;
      }
      .status-badge.success {
        background: #e6f4ea;
        color: #137333;
      }
      .status-badge.failure {
        background: #fce8e6;
        color: #c5221f;
      }
      .explanation {
        font-size: 14px;
        color: #5f6368;
        line-height: 1.5;
        background: #f8f9fa;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
      }
      .highlight-row {
        background-color: #f1f3f4;
        font-weight: bold;
      }
    `,
  ];

  @property() stage: NegotiationPayoutStageConfig | null = null;
  private cohortService = core.getService(CohortService);
  private participantService = core.getService(ParticipantService);

  override render() {
    if (!this.stage) {
      return nothing;
    }

    interface NegotiationProfilePublicData {
      participantMap?: Record<string, string>;
    }
    const negProfileData = this.cohortService.stagePublicDataMap[
      'negotiation_profile'
    ] as NegotiationProfilePublicData | undefined;
    if (!negProfileData?.participantMap) {
      return html`
        <stage-description .stage=${this.stage}></stage-description>
        <div class="payout-card">
          <div>
            Negotiation profile data not available yet. Please complete the
            earlier stages.
          </div>
        </div>
      `;
    }

    const partyMap: Record<
      string,
      {publicId: string; name: string; avatar: string}
    > = {};
    for (const [pubId, itemId] of Object.entries(
      negProfileData.participantMap,
    )) {
      const p = this.cohortService.participantMap[pubId];
      if (typeof itemId === 'string' && p) {
        partyMap[itemId] = {
          publicId: pubId,
          name: p.name ?? pubId,
          avatar: p.avatar ?? '👤',
        };
      }
    }

    interface SurveyPublicData {
      participantAnswerMap?: Record<
        string,
        Record<string, {choiceId?: string; value?: string | number}>
      >;
    }
    const surveyData = this.cohortService.stagePublicDataMap[
      'fa00266d-2987-4dc1-8f30-e8febb63939d'
    ] as SurveyPublicData | undefined;
    const answerMap = surveyData?.participantAnswerMap ?? {};

    const getPartySubmission = (itemId: string) => {
      const pubId = partyMap[itemId]?.publicId;
      if (!pubId || !answerMap[pubId])
        return {coalition: 'Not submitted', points: 0};
      const userAnswers = answerMap[pubId];
      const coalAns =
        userAnswers['5c95a991-483a-418f-90e3-d3a53e2aa06f']?.choiceId;
      let coalition = 'Not selected';
      if (coalAns === 'ea5fff0d-7a01-4b81-a383-b7e8dd3f5072')
        coalition = 'A+B+C';
      else if (coalAns === 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571')
        coalition = 'A+B';
      else if (coalAns === '602e3349-4626-4255-ac3a-abebb5f99307')
        coalition = 'A+C';
      else if (coalAns === '22cd5855-3a02-4b38-89ad-80a97a4f7d53')
        coalition = 'B+C';

      const ptsAns = Number(
        userAnswers['da77c231-efa0-4cf3-91fb-326de91f1d37']?.value ?? 0,
      );
      return {coalition, points: ptsAns};
    };

    const subA = getPartySubmission('party-a');
    const subB = getPartySubmission('party-b');
    const subC = getPartySubmission('party-c');

    let formedCoalition = 'None';
    let isSuccess = false;
    let explanation =
      'No valid coalition agreement was reached or point demands did not sum exactly to the coalition target total.';

    if (
      subA.coalition === 'A+B' &&
      subB.coalition === 'A+B' &&
      subA.points + subB.points === 118
    ) {
      formedCoalition = 'A+B (118 points total)';
      isSuccess = true;
      explanation = `Party A and Party B successfully formed Coalition A+B. Their agreed points (${subA.points} + ${subB.points}) sum exactly to the 118 point target. Party C is excluded and receives 0 points.`;
    } else if (
      subA.coalition === 'A+C' &&
      subC.coalition === 'A+C' &&
      subA.points + subC.points === 84
    ) {
      formedCoalition = 'A+C (84 points total)';
      isSuccess = true;
      explanation = `Party A and Party C successfully formed Coalition A+C. Their agreed points (${subA.points} + ${subC.points}) sum exactly to the 84 point target. Party B is excluded and receives 0 points.`;
    } else if (
      subB.coalition === 'B+C' &&
      subC.coalition === 'B+C' &&
      subB.points + subC.points === 50
    ) {
      formedCoalition = 'B+C (50 points total)';
      isSuccess = true;
      explanation = `Party B and Party C successfully formed Coalition B+C. Their agreed points (${subB.points} + ${subC.points}) sum exactly to the 50 point target. Party A is excluded and receives 0 points.`;
    } else if (
      subA.coalition === 'A+B+C' &&
      subB.coalition === 'A+B+C' &&
      subC.coalition === 'A+B+C' &&
      subA.points + subB.points + subC.points === 121
    ) {
      formedCoalition = 'A+B+C (121 points total)';
      isSuccess = true;
      explanation = `All three parties successfully formed the Grand Coalition A+B+C. Their agreed points (${subA.points} + ${subB.points} + ${subC.points}) sum exactly to the 121 point target.`;
    }

    let payoutA = 0;
    let payoutB = 0;
    let payoutC = 0;
    if (isSuccess) {
      if (formedCoalition.startsWith('A+B+C')) {
        payoutA = subA.points;
        payoutB = subB.points;
        payoutC = subC.points;
      } else if (formedCoalition.startsWith('A+B')) {
        payoutA = subA.points;
        payoutB = subB.points;
      } else if (formedCoalition.startsWith('A+C')) {
        payoutA = subA.points;
        payoutC = subC.points;
      } else if (formedCoalition.startsWith('B+C')) {
        payoutB = subB.points;
        payoutC = subC.points;
      }
    }

    const currentPubId = this.participantService.profile?.publicId;
    const rate = 7.8 / 118; // $7.80 total for the 118 point target

    const renderRow = (
      itemId: string,
      defaultName: string,
      defaultAvatar: string,
      sub: {coalition: string; points: number},
      payout: number,
    ) => {
      const party = partyMap[itemId];
      const name = party ? party.name : defaultName;
      const avatar = party ? party.avatar : defaultAvatar;
      const isCurrent = party && party.publicId === currentPubId;

      return html`
        <tr class=${isCurrent ? 'highlight-row' : ''}>
          <td>
            <span class="party-tag">${defaultName}</span>
            <span style="margin-left: 8px;"
              >${avatar} ${name} ${isCurrent ? '(You)' : ''}</span
            >
          </td>
          <td>${sub.coalition}</td>
          <td>${sub.points} pts</td>
          <td>
            <strong>${payout} pts ($${(payout * rate).toFixed(2)})</strong>
          </td>
        </tr>
      `;
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="payout-card">
        <div class="payout-header">
          Negotiation Payout Summary & Coalition Results
        </div>

        <div class="status-badge ${isSuccess ? 'success' : 'failure'}">
          ${isSuccess
            ? '✅ Coalition Validated'
            : '❌ Deal Failed / Points Mismatch'}
        </div>

        <div class="explanation"><strong>Result:</strong> ${explanation}</div>

        <table class="payout-table">
          <thead>
            <tr>
              <th>Party Role</th>
              <th>Reported Coalition</th>
              <th>Submitted Points</th>
              <th>Final Payout (Based on $7.80 pool)</th>
            </tr>
          </thead>
          <tbody>
            ${renderRow('party-a', 'Party A', '🔴', subA, payoutA)}
            ${renderRow('party-b', 'Party B', '🔵', subB, payoutB)}
            ${renderRow('party-c', 'Party C', '🟢', subC, payoutC)}
          </tbody>
        </table>
      </div>
      <stage-footer>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'negotiation-payout-participant-view': NegotiationPayoutParticipantView;
  }
}
