import '../participant_profile/profile_display';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  RankingStagePublicData,
  RankingItem,
  RankingRevealItem,
  RevealAudience,
} from '@deliberation-lab/utils';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {styles} from './ranking_reveal_view.scss';
import {
  ParticipantProfile,
  ElectionStrategy,
  RankingStageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {RankingType} from '@deliberation-lab/utils';

/** Ranking reveal */
@customElement('ranking-reveal-view')
export class RankingReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() item: RankingRevealItem | undefined = undefined;
  @property() publicData: RankingStagePublicData | undefined = undefined;

  private renderParticipantWinner(winnerId: string) {
    const leader = this.cohortService.participantMap[winnerId];
    if (!leader) return nothing;

    return html`
      <div class="reveal-wrapper">
        <h3>The winner of the election is:</h3>
        <participant-profile-display .profile=${leader} displayType="stage">
        </participant-profile-display>
      </div>
    `;
  }

  private renderItemWinner(winnerId: string) {
    if (!this.publicData) return nothing;

    const stage = this.experimentService.getStage(this.publicData.id);
    if (!stage || stage.kind !== StageKind.RANKING) return nothing;

    const item =
      stage.rankingType === RankingType.ITEMS
        ? stage.rankingItems.find((item) => item.id === winnerId)
        : undefined;
    if (!item) return nothing;

    return html`
      <div class="reveal-wrapper">
        <h3>The winning item is:</h3>
        <div class="reveal">${item.text}</div>
      </div>
    `;
  }

  private renderWinner() {
    if (!this.publicData) return nothing;

    const rankingStage = this.experimentService.getStage(this.publicData.id);
    if (!rankingStage || rankingStage.kind !== StageKind.RANKING) return;

    const hasWinner = rankingStage.strategy !== ElectionStrategy.NONE;
    if (!hasWinner) return nothing;

    const winnerId = this.publicData.winnerId;

    const isItemRanking = rankingStage.rankingType === RankingType.ITEMS;
    return isItemRanking
      ? this.renderItemWinner(winnerId)
      : this.renderParticipantWinner(winnerId);
  }

  private renderResultsTable() {
    if (!this.publicData || !this.item) return;

    // TODO: Fix broken logic
    const showAllParticipants =
      this.item.revealAudience === RevealAudience.ALL_PARTICIPANTS;

    const headerText = showAllParticipants
      ? 'Here are the rankings of your group:'
      : 'As a reminder, here are your rankings.';

    const stage = this.experimentService.stageConfigMap[this.publicData.id];
    if (!stage || stage.kind !== StageKind.RANKING) return nothing;

    const isItemRanking = stage.rankingType === RankingType.ITEMS;

    const getEntryText = (entry: string) => {
      if (!this.publicData) return '';

      if (isItemRanking) {
        const item = stage.rankingItems.find((item) => item.id === entry);
        return item ? item.text : 'Unknown item';
      } else {
        const participant = this.cohortService.participantMap[entry];
        return participant
          ? getParticipantInlineDisplay(participant)
          : 'Unknown participant';
      }
    };

    const currentId = this.participantService.profile?.publicId ?? '';
    let participantMap = this.publicData.participantAnswerMap;

    if (!showAllParticipants) {
      if (!(currentId in participantMap)) {
        return nothing;
      }
      participantMap = {[currentId]: participantMap[currentId]};
    }

    const maxOptions = Math.max(
      ...Object.values(participantMap).map((lst) => lst.length),
    );

    return html`
      <div>${headerText}</div>
      <div class="participant-votes-table">
        <div class="table-head">
          <div class="table-row">
            <div class="table-cell rank-row">Rank</div>
            ${Object.keys(participantMap).map((publicId) => {
              const profile = this.cohortService.participantMap[publicId];
              return html`
                <div class="table-cell">
                  ${profile ? getParticipantInlineDisplay(profile) : publicId}
                </div>
              `;
            })}
          </div>
        </div>

        <div class="table-body">
          ${[...Array(maxOptions).keys()].map(
            (rowIndex) => html`
              <div class="table-row">
                <div class="table-cell rank-row">${rowIndex + 1}</div>
                ${Object.keys(participantMap).map((participant) => {
                  const votedItems = participantMap[participant].map(
                    (itemId: string) => getEntryText(itemId),
                  );
                  const itemText = votedItems[rowIndex] || '';
                  return html` <div class="table-cell">${itemText}</div> `;
                })}
              </div>
            `,
          )}
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.publicData) {
      return html`<div class="reveal-wrapper">No election winner.</div>`;
    }

    const electionName = this.experimentService.getStageName(
      this.publicData.id,
    );
    return html`
      <h2>
        Results for <b><i>${electionName}</i></b> stage
      </h2>
      ${this.renderWinner()}
      <div class="divider"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ranking-reveal-view': RankingReveal;
  }
}
