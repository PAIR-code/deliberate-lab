import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {css} from 'lit';

import {
  NEGOTIATION_PROFILE_SET_ID,
  NegotiationPayoutStageConfig,
  NegotiationProfileStageConfig,
  StageKind,
  SurveyStageConfig,
} from '@deliberation-lab/utils';
import {
  NEGOTIATION_FINAL_DECISION_STAGE_ID,
  calculateNegotiationPayout,
  extractPartySubmission,
  findNegotiationFinalDecisionStage,
} from '../../shared/negotiation_payout.utils';
import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
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
  private experimentService = core.getService(ExperimentService);

  override render() {
    if (!this.stage) {
      return nothing;
    }

    interface NegotiationProfilePublicData {
      participantMap?: Record<string, string>;
    }

    // 1. Locate Negotiation Profile public data dynamically
    const findNegProfilePublicData = ():
      | NegotiationProfilePublicData
      | undefined => {
      const negStage = this.experimentService.stages.find(
        (s) => s.kind === StageKind.NEGOTIATION_PROFILE,
      );
      if (negStage && this.cohortService.stagePublicDataMap[negStage.id]) {
        return this.cohortService.stagePublicDataMap[
          negStage.id
        ] as NegotiationProfilePublicData;
      }
      if (this.cohortService.stagePublicDataMap['negotiation_profile']) {
        return this.cohortService.stagePublicDataMap[
          'negotiation_profile'
        ] as NegotiationProfilePublicData;
      }
      for (const pd of Object.values(this.cohortService.stagePublicDataMap)) {
        if (
          (pd as {kind?: string}).kind === StageKind.NEGOTIATION_PROFILE &&
          (pd as NegotiationProfilePublicData).participantMap
        ) {
          return pd as NegotiationProfilePublicData;
        }
      }
      return undefined;
    };

    const negProfileData = findNegProfilePublicData();
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

    const negStage = this.experimentService.stages.find(
      (s) => s.kind === StageKind.NEGOTIATION_PROFILE,
    ) as NegotiationProfileStageConfig | undefined;

    const partyMap: Record<
      string,
      {publicId: string; name: string; avatar: string}
    > = {};

    const registerPartyKey = (
      key: string,
      pInfo: {publicId: string; name: string; avatar: string},
    ) => {
      partyMap[key] = pInfo;
      partyMap[key.toLowerCase()] = pInfo;
      const lower = key.toLowerCase();
      if (
        lower.includes('party-a') ||
        lower.includes('party a') ||
        lower === 'a'
      ) {
        partyMap['party-a'] = pInfo;
        partyMap['Party A'] = pInfo;
      } else if (
        lower.includes('party-b') ||
        lower.includes('party b') ||
        lower === 'b'
      ) {
        partyMap['party-b'] = pInfo;
        partyMap['Party B'] = pInfo;
      } else if (
        lower.includes('party-c') ||
        lower.includes('party c') ||
        lower === 'c'
      ) {
        partyMap['party-c'] = pInfo;
        partyMap['Party C'] = pInfo;
      }
    };

    for (const [pubId, itemId] of Object.entries(
      negProfileData.participantMap,
    )) {
      if (typeof itemId !== 'string') continue;
      const p = this.cohortService.participantMap[pubId];
      const pInfo = {
        publicId: pubId,
        name: p?.name ?? pubId,
        avatar: p?.avatar ?? '👤',
      };

      registerPartyKey(itemId, pInfo);

      if (negStage?.items) {
        const item = negStage.items.find(
          (it) =>
            it.id === itemId ||
            it.name === itemId ||
            it.id.toLowerCase() === itemId.toLowerCase() ||
            it.name.toLowerCase() === itemId.toLowerCase(),
        );
        if (item) {
          registerPartyKey(item.id, pInfo);
          registerPartyKey(item.name, pInfo);
        }
      }
    }

    // Also check anonymousProfiles on cached participant profiles as fallback
    for (const [pubId, p] of Object.entries(
      this.cohortService.participantMap,
    )) {
      const anonName = p.anonymousProfiles?.[NEGOTIATION_PROFILE_SET_ID]?.name;
      if (anonName) {
        const pInfo = {
          publicId: pubId,
          name: p.name ?? pubId,
          avatar: p.avatar ?? '👤',
        };
        registerPartyKey(anonName, pInfo);
      }
    }

    interface SurveyPublicData {
      participantAnswerMap?: Record<
        string,
        Record<
          string,
          {choiceId?: string; value?: string | number; answer?: string}
        >
      >;
    }

    // 2. Locate Final Decision Survey stage and public data dynamically
    const findSurveyStageAndPublicData = () => {
      const surveyStages = this.experimentService.stages.filter(
        (s) => s.kind === StageKind.SURVEY,
      ) as SurveyStageConfig[];

      // Select the negotiation "Final Decision" survey using negotiation-specific
      // signals first. A loose "final decision" name match is unsafe here: when a
      // consensus study precedes the negotiation study, its own "Final Decision"
      // survey would otherwise be picked and the payout would read wrong answers.
      const targetStage = findNegotiationFinalDecisionStage(surveyStages);

      if (
        targetStage &&
        this.cohortService.stagePublicDataMap[targetStage.id]
      ) {
        return {
          stage: targetStage,
          publicData: this.cohortService.stagePublicDataMap[
            targetStage.id
          ] as SurveyPublicData,
        };
      }

      const fallbackPublicData = this.cohortService.stagePublicDataMap[
        NEGOTIATION_FINAL_DECISION_STAGE_ID
      ] as SurveyPublicData | undefined;

      if (fallbackPublicData) {
        return {stage: targetStage, publicData: fallbackPublicData};
      }

      for (const [sId, pd] of Object.entries(
        this.cohortService.stagePublicDataMap,
      )) {
        const pData = pd as SurveyPublicData;
        if (
          pData?.participantAnswerMap &&
          Object.keys(pData.participantAnswerMap).length > 0
        ) {
          const s = this.experimentService.stages.find(
            (st) => st.id === sId,
          ) as SurveyStageConfig | undefined;
          return {stage: s ?? targetStage, publicData: pData};
        }
      }

      return {stage: targetStage, publicData: undefined};
    };

    const {stage: surveyStage, publicData: surveyData} =
      findSurveyStageAndPublicData();
    const answerMap = surveyData?.participantAnswerMap ?? {};

    const pubIdA = partyMap['party-a']?.publicId;
    const pubIdB = partyMap['party-b']?.publicId;
    const pubIdC = partyMap['party-c']?.publicId;

    const subA = extractPartySubmission(
      pubIdA ? answerMap[pubIdA] : undefined,
      surveyStage,
    );
    const subB = extractPartySubmission(
      pubIdB ? answerMap[pubIdB] : undefined,
      surveyStage,
    );
    const subC = extractPartySubmission(
      pubIdC ? answerMap[pubIdC] : undefined,
      surveyStage,
    );

    const {isSuccess, explanation, payouts} = calculateNegotiationPayout(
      subA,
      subB,
      subC,
    );

    const payoutA = payouts['party-a'];
    const payoutB = payouts['party-b'];
    const payoutC = payouts['party-c'];

    const currentPubId = this.participantService.profile?.publicId;

    const renderRow = (
      itemId: string,
      defaultName: string,
      sub: {coalition: string; money: number},
      payout: number,
    ) => {
      const party = partyMap[itemId];
      const name = party ? party.name : defaultName;
      const avatar = party?.avatar || '👤';
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
          <td>$${sub.money}</td>
          <td>
            <strong>$${payout}</strong>
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
            ? '✅ The negotiating parties successfully formed a valid coalition.'
            : '❌ The negotiating parties did not form a valid coalition.'}
        </div>

        <div class="explanation"><strong>Result:</strong> ${explanation}</div>

        <table class="payout-table">
          <thead>
            <tr>
              <th>Party Role</th>
              <th>Reported Coalition</th>
              <th>Submitted Amount</th>
              <th>Final Payout</th>
            </tr>
          </thead>
          <tbody>
            ${renderRow('party-a', 'Party A', subA, payoutA)}
            ${renderRow('party-b', 'Party B', subB, payoutB)}
            ${renderRow('party-c', 'Party C', subC, payoutC)}
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
