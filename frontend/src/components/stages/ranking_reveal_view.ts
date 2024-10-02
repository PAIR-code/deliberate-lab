import '../participant_profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  RankingStagePublicData,
  RankingItem,
  RankingRevealItem,
  RevealAudience,
} from '@deliberation-lab/utils';
import {
  getParticipantName,
  getParticipantPronouns,
} from '../../shared/participant.utils';

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

  private renderParticipantWinner(leader: ParticipantProfile) {
    return html`
      <div class="reveal-wrapper">
        <h3>The winner of the election is:</h3>
        <div class="reveal">
          <profile-avatar .emoji=${leader.avatar} .square=${true}>
          </profile-avatar>
          <div class="info">
            <div class="title">${getParticipantName(leader)}</div>
            <div class="subtitle">${getParticipantPronouns(leader)}</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderItemWinner(item: RankingItem | undefined) {
    if (!item) {
      return;
    }

    return html`
      <div class="reveal-wrapper">
        <h3>The winning item is:</h3>
        <div class="reveal">${item.text}</div>
      </div>
    `;
  }

  private renderWinner() {
    if (!this.publicData) return;

    const isItemRanking =
      (
        this.experimentService.stageConfigMap[
          this.publicData.id
        ] as RankingStageConfig
      ).rankingType === RankingType.ITEMS;
    const hasWinner =
      (
        this.experimentService.stageConfigMap[
          this.publicData.id
        ] as RankingStageConfig
      ).strategy === ElectionStrategy.CONDORCET &&
      this.publicData.currentWinner;

    // Display the winner.
    if (hasWinner) {
      const winner = this.publicData.currentWinner;
      // This is a participant election.
      if (!isItemRanking) {
        const leader = this.cohortService.participantMap[winner];
        return this.renderParticipantWinner(leader);
      } else {
        // This is an item election.
        const winningItem = this.publicData.rankingItems.find(
          (item) => item.id === winner
        );
        return this.renderItemWinner(winningItem);
      }
    }
    return '';
  }

  private renderResultsTable() {
    if (!this.publicData || !this.item) return;

    const showAllParticipants =
      this.item.revealAudience === RevealAudience.ALL_PARTICIPANTS;

    const headerText = showAllParticipants
      ? 'Here are the rankings of your group:'
      : 'As a reminder, here are your rankings.';

    const curId = this.participantService.profile!.publicId!;
    if (!showAllParticipants && !curId) {
      return '';
    }

    const stage = this.experimentService.stageConfigMap[this.publicData.id];
    if (!stage || stage.kind !== StageKind.RANKING) return nothing;

    const isItemRanking = stage.rankingType === RankingType.ITEMS;

    const getEntryText = (entry: string) => {
      if (!this.publicData) return '';

      if (isItemRanking) {
        const item = this.publicData.rankingItems.find(
          (item) => item.id === entry
        );
        return item ? item.text : 'Unknown item';
      } else {
        const participant = this.cohortService.participantMap[entry];
        return participant
          ? getParticipantName(participant)
          : 'Unknown participant';
      }
    };

    const participantMap = showAllParticipants
      ? this.publicData.participantAnswerMap
      : {[curId]: this.publicData.participantAnswerMap[curId]};

    const maxOptions = Math.max(
      ...Object.values(participantMap).map((list) => list.length)
    );

    return html`
      <div>${headerText}</div>
      <div class="participant-votes-table">
        <div class="table-head">
          <div class="table-row">
            <div class="table-cell rank-row">Rank</div>
            ${Object.keys(participantMap).map(
              (participant) => html`
                <div class="table-cell">
                  ${getParticipantName(
                    this.cohortService.participantMap[participant]
                  ) ?? participant}
                </div>
              `
            )}
          </div>
        </div>

        <div class="table-body">
          ${[...Array(maxOptions).keys()].map(
            (rowIndex) => html`
              <div class="table-row">
                <div class="table-cell rank-row">${rowIndex + 1}</div>
                ${Object.keys(participantMap).map((participant) => {
                  const votedItems = participantMap[participant].map(
                    (itemId: string) => getEntryText(itemId)
                  );
                  const itemText = votedItems[rowIndex] || '';
                  return html` <div class="table-cell">${itemText}</div> `;
                })}
              </div>
            `
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
      this.publicData.id
    );
    return html`
      <h2>Results for ${electionName}</h2>
      ${this.renderWinner()} ${this.renderResultsTable()}
      <div class="divider"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ranking-reveal-view': RankingReveal;
  }
}
