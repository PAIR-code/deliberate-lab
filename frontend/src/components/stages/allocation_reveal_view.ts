import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  MultiAssetAllocationStagePublicData,
  MultiAssetAllocationStageConfig,
  computeMultiAssetConsensusScore,
} from '@deliberation-lab/utils';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';

import {styles} from './ranking_reveal_view.scss';

@customElement('allocation-reveal-view')
export class AllocationReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);

  @property() stage: MultiAssetAllocationStageConfig | undefined = undefined;
  @property() publicData: MultiAssetAllocationStagePublicData | undefined =
    undefined;
  @property({type: String}) displayMode: 'full' | 'scoreOnly' = 'full';

  private renderAllocationTable() {
    if (!this.publicData || !this.stage) return nothing;

    const participantAnswerMap = this.publicData.participantAnswerMap;
    const participantIds = Object.keys(participantAnswerMap);
    if (participantIds.length === 0) return nothing;
    const assets = this.stage.stockOptions;

    return html`
      <div class="participant-votes-table">
        <div class="table-head">
          <div class="table-row">
            <div class="table-cell rank-row">Participant</div>
            ${assets.map(
              (asset) => html`<div class="table-cell">${asset.name}</div>`,
            )}
          </div>
        </div>
        <div class="table-body">
          ${participantIds.map((participantId) => {
            const profile = this.cohortService.participantMap[participantId];
            const participantAnswer = participantAnswerMap[participantId];
            return html`
              <div class="table-row">
                <div class="table-cell rank-row">
                  ${profile
                    ? getParticipantInlineDisplay(profile)
                    : participantId}
                </div>
                ${assets.map((asset) => {
                  const percentage =
                    participantAnswer.allocationMap[asset.id]?.percentage;
                  return html`<div class="table-cell">
                    ${percentage?.toFixed(1) ?? '0'}%
                  </div>`;
                })}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderConsensusScoreOnly() {
    const stageName = this.experimentService.getStageName(this.stage!.id);
    const consensusScore = computeMultiAssetConsensusScore(this.publicData);

    return html`
      <div class="round-results-wrapper consensus-only">
        <h3>Results for <i>${stageName}</i></h3>
        <div class="consensus-score">
          <strong>Consensus Score: ${consensusScore.toFixed(1)}%</strong>
        </div>
        <div class="divider"></div>
      </div>
    `;
  }

  override render() {
    if (!this.publicData || !this.stage) {
      return html`<p><em>Waiting for allocation data...</em></p>`;
    }

    if (this.displayMode === 'scoreOnly') {
      return this.renderConsensusScoreOnly();
    }

    const consensusScore = computeMultiAssetConsensusScore(this.publicData);
    const stageName = this.experimentService.getStageName(this.stage.id);

    return html`
      <div class="round-results-wrapper">
        <h3>Results for <i>${stageName}</i></h3>
        ${this.renderAllocationTable()}
        <div class="consensus-score">
          <strong>Consensus Score: ${consensusScore.toFixed(1)}%</strong>
        </div>
        <div class="divider"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'allocation-reveal-view': AllocationReveal;
  }
}
