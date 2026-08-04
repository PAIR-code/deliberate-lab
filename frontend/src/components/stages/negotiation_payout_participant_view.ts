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

    // 2. Locate Survey stage and public data dynamically
    const findSurveyStageAndPublicData = () => {
      const surveyStages = this.experimentService.stages.filter(
        (s) => s.kind === StageKind.SURVEY,
      ) as SurveyStageConfig[];

      let targetStage = surveyStages.find(
        (s) =>
          s.name?.toLowerCase().includes('final decision') ||
          s.name?.toLowerCase().includes('task 2'),
      );
      if (!targetStage && surveyStages.length > 0) {
        targetStage = surveyStages[surveyStages.length - 1];
      }

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
        'fa00266d-2987-4dc1-8f30-e8febb63939d'
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

    const getPartySubmission = (itemId: string) => {
      const pubId = partyMap[itemId]?.publicId;
      if (!pubId || !answerMap[pubId]) {
        return {coalition: 'Not submitted', money: 0};
      }
      const userAnswers = answerMap[pubId];

      let coalition = 'Not selected';
      let money = 0;

      // Try hardcoded question IDs first (for backwards compatibility)
      const hardcodedCoalChoiceId =
        userAnswers['5c95a991-483a-418f-90e3-d3a53e2aa06f']?.choiceId;
      if (hardcodedCoalChoiceId) {
        if (hardcodedCoalChoiceId === 'ea5fff0d-7a01-4b81-a383-b7e8dd3f5072')
          coalition = 'A+B+C';
        else if (
          hardcodedCoalChoiceId === 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571'
        )
          coalition = 'A+B';
        else if (
          hardcodedCoalChoiceId === '602e3349-4626-4255-ac3a-abebb5f99307'
        )
          coalition = 'A+C';
        else if (
          hardcodedCoalChoiceId === '22cd5855-3a02-4b38-89ad-80a97a4f7d53'
        )
          coalition = 'B+C';
      }

      const hardcodedMoneyRaw =
        userAnswers['da77c231-efa0-4cf3-91fb-326de91f1d37']?.answer ??
        userAnswers['da77c231-efa0-4cf3-91fb-326de91f1d37']?.value;
      if (
        hardcodedMoneyRaw !== undefined &&
        hardcodedMoneyRaw !== null &&
        hardcodedMoneyRaw !== ''
      ) {
        const num = parseFloat(
          String(hardcodedMoneyRaw).replace(/[^0-9.]/g, ''),
        );
        if (!isNaN(num)) money = num;
      }

      // Dynamic inspection of user answers
      for (const [qId, ansObj] of Object.entries(userAnswers)) {
        if (!ansObj) continue;

        // Check choiceId / MC questions for coalition
        const choiceId = (ansObj as {choiceId?: string}).choiceId;
        if (coalition === 'Not selected' && choiceId) {
          if (surveyStage && surveyStage.questions) {
            const question = surveyStage.questions.find((q) => q.id === qId);
            if (
              question &&
              'options' in question &&
              Array.isArray((question as {options?: unknown[]}).options)
            ) {
              const opt = (
                question as {options: Array<{id: string; text?: string}>}
              ).options.find((o) => o.id === choiceId);
              if (opt && opt.text) {
                coalition = opt.text.trim();
              }
            }
          }

          if (coalition === 'Not selected') {
            if (choiceId === 'ea5fff0d-7a01-4b81-a383-b7e8dd3f5072')
              coalition = 'A+B+C';
            else if (choiceId === 'b0cab089-b7b7-4827-a9a4-ebc1dfcc7571')
              coalition = 'A+B';
            else if (choiceId === '602e3349-4626-4255-ac3a-abebb5f99307')
              coalition = 'A+C';
            else if (choiceId === '22cd5855-3a02-4b38-89ad-80a97a4f7d53')
              coalition = 'B+C';
          }
        }

        // Check answer / value text directly for coalition if not found
        const textVal = String(
          (ansObj as {answer?: string; value?: unknown}).answer ??
            (ansObj as {answer?: string; value?: unknown}).value ??
            '',
        );
        if (coalition === 'Not selected' && textVal) {
          const upperText = textVal.replace(/\s+/g, '').toUpperCase();
          if (upperText.includes('A+B+C') || upperText.includes('ABC'))
            coalition = 'A+B+C';
          else if (upperText.includes('A+B') || upperText.includes('AB'))
            coalition = 'A+B';
          else if (upperText.includes('A+C') || upperText.includes('AC'))
            coalition = 'A+C';
          else if (upperText.includes('B+C') || upperText.includes('BC'))
            coalition = 'B+C';
        }

        // Check text / scale answers for money
        if (money === 0) {
          const rawVal =
            (ansObj as {answer?: string; value?: number}).answer ??
            (ansObj as {answer?: string; value?: number}).value;
          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            const num = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) {
              money = num;
            }
          }
        }
      }

      // Normalize coalition string
      const norm = coalition.replace(/\s+/g, '').toUpperCase();
      if (norm.includes('A+B+C')) coalition = 'A+B+C';
      else if (norm.includes('A+B')) coalition = 'A+B';
      else if (norm.includes('A+C')) coalition = 'A+C';
      else if (norm.includes('B+C')) coalition = 'B+C';

      return {coalition, money};
    };

    const subA = getPartySubmission('party-a');
    const subB = getPartySubmission('party-b');
    const subC = getPartySubmission('party-c');

    let formedCoalition = 'None';
    let isSuccess = false;
    let explanation =
      'No valid coalition agreement was reached or submitted money demands exceeded the coalition target total.';

    const EPSILON = 0.001;

    if (subA.coalition === 'A+B' && subB.coalition === 'A+B') {
      const sum = subA.money + subB.money;
      if (sum <= 7.6 + EPSILON) {
        formedCoalition = 'A+B ($7.60 max)';
        isSuccess = true;
        explanation = `Party A and Party B successfully formed Coalition A+B. Their requested amounts ($${subA.money.toFixed(
          2,
        )} + $${subB.money.toFixed(2)} = $${sum.toFixed(
          2,
        )}) fit within the $7.60 limit. Party C is excluded and receives $0.00.`;
      } else {
        explanation = `Party A and Party B both selected Coalition A+B, but their total requested amounts ($${subA.money.toFixed(
          2,
        )} + $${subB.money.toFixed(2)} = $${sum.toFixed(
          2,
        )}) exceeded the $7.60 limit by $${(sum - 7.6).toFixed(
          2,
        )}. Deal failed.`;
      }
    } else if (subA.coalition === 'A+C' && subC.coalition === 'A+C') {
      const sum = subA.money + subC.money;
      if (sum <= 5.5 + EPSILON) {
        formedCoalition = 'A+C ($5.50 max)';
        isSuccess = true;
        explanation = `Party A and Party C successfully formed Coalition A+C. Their requested amounts ($${subA.money.toFixed(
          2,
        )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
          2,
        )}) fit within the $5.50 limit. Party B is excluded and receives $0.00.`;
      } else {
        explanation = `Party A and Party C both selected Coalition A+C, but their total requested amounts ($${subA.money.toFixed(
          2,
        )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
          2,
        )}) exceeded the $5.50 limit by $${(sum - 5.5).toFixed(
          2,
        )}. Deal failed.`;
      }
    } else if (subB.coalition === 'B+C' && subC.coalition === 'B+C') {
      const sum = subB.money + subC.money;
      if (sum <= 3.2 + EPSILON) {
        formedCoalition = 'B+C ($3.20 max)';
        isSuccess = true;
        explanation = `Party B and Party C successfully formed Coalition B+C. Their requested amounts ($${subB.money.toFixed(
          2,
        )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
          2,
        )}) fit within the $3.20 limit. Party A is excluded and receives $0.00.`;
      } else {
        explanation = `Party B and Party C both selected Coalition B+C, but their total requested amounts ($${subB.money.toFixed(
          2,
        )} + $${subC.money.toFixed(2)} = $${sum.toFixed(
          2,
        )}) exceeded the $3.20 limit by $${(sum - 3.2).toFixed(
          2,
        )}. Deal failed.`;
      }
    } else if (
      subA.coalition === 'A+B+C' &&
      subB.coalition === 'A+B+C' &&
      subC.coalition === 'A+B+C'
    ) {
      const sum = subA.money + subB.money + subC.money;
      if (sum <= 7.8 + EPSILON) {
        formedCoalition = 'A+B+C ($7.80 max)';
        isSuccess = true;
        explanation = `All three parties successfully formed the Grand Coalition A+B+C. Their requested amounts ($${subA.money.toFixed(
          2,
        )} + $${subB.money.toFixed(2)} + $${subC.money.toFixed(
          2,
        )} = $${sum.toFixed(2)}) fit within the $7.80 limit.`;
      } else {
        explanation = `All three parties selected Coalition A+B+C, but their total requested amounts ($${subA.money.toFixed(
          2,
        )} + $${subB.money.toFixed(2)} + $${subC.money.toFixed(
          2,
        )} = $${sum.toFixed(2)}) exceeded the $7.80 limit by $${(
          sum - 7.8
        ).toFixed(2)}. Deal failed.`;
      }
    }

    let payoutA = 0;
    let payoutB = 0;
    let payoutC = 0;
    if (isSuccess) {
      if (formedCoalition.startsWith('A+B+C')) {
        payoutA = subA.money;
        payoutB = subB.money;
        payoutC = subC.money;
      } else if (formedCoalition.startsWith('A+B')) {
        payoutA = subA.money;
        payoutB = subB.money;
      } else if (formedCoalition.startsWith('A+C')) {
        payoutA = subA.money;
        payoutC = subC.money;
      } else if (formedCoalition.startsWith('B+C')) {
        payoutB = subB.money;
        payoutC = subC.money;
      }
    }

    const currentPubId = this.participantService.profile?.publicId;

    const renderRow = (
      itemId: string,
      defaultName: string,
      defaultAvatar: string,
      sub: {coalition: string; money: number},
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
          <td>$${sub.money.toFixed(2)}</td>
          <td>
            <strong>$${payout.toFixed(2)}</strong>
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
            : '❌ Deal Failed / Amount Mismatch'}
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
