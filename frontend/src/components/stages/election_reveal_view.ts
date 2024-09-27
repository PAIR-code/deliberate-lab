import '../participant_profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {ElectionStagePublicData, ElectionItem} from '@deliberation-lab/utils';
import {
  getParticipantName,
  getParticipantPronouns,
} from '../../shared/participant.utils';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';

import {styles} from './election_reveal_view.scss';
import {ParticipantProfile, ElectionStrategy, ElectionStageConfig} from '@deliberation-lab/utils';
import { ElectionType } from '@deliberation-lab/utils';

/** Election reveal */
@customElement('election-reveal-view')
export class ElectionReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);

  @property() publicData: ElectionStagePublicData | undefined = undefined;

  private renderParticipantWinner(leader: ParticipantProfile) {
    return html` <div class="reveal-wrapper">
      <h3>The winner of the election is:</h3>
      <div class="reveal">
        <profile-avatar .emoji=${leader.avatar} .square=${true}>
        </profile-avatar>
        <div class="info">
          <div class="title">${getParticipantName(leader)}</div>
          <div class="subtitle">${getParticipantPronouns(leader)}</div>
        </div>
      </div>
    </div>`;
  }

  private renderItemWinner(item: ElectionItem | undefined) {
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

  override render() {
    if (!this.publicData) {
      return html`<div class="reveal-wrapper">No election winner.</div>`;
    }

    const isItemElection =
      (this.experimentService.stageConfigMap[this.publicData.id] as ElectionStageConfig).electionType === ElectionType.ITEMS;
    const hasWinner =
      (this.experimentService.stageConfigMap[this.publicData.id] as ElectionStageConfig).strategy === ElectionStrategy.CONDORCET;

    console.log(isItemElection);
    console.log(hasWinner);
    // Display the winner.
    let winnerDisplayHTML;
    if (hasWinner) {
      const winner = this.publicData.currentWinner ?? '';
      // This is a participant election.
      if (!isItemElection) {
        const leader = this.cohortService.participantMap[winner];
        winnerDisplayHTML = this.renderParticipantWinner(leader);
      } else {
        // This is an item election.
        const winningItem = this.publicData.electionItems.find(
          (item) => item.id === winner
        );
        winnerDisplayHTML = this.renderItemWinner(winningItem);
      }
    }

    // TODO: Optionally display how people voted.
    let resultsDisplayHTML;

    if (isItemElection) {
      const electionIdToText = new Map(
        this.publicData.electionItems.map((item) => [item.id, item.text])
      );
      const maxOptions = this.publicData.electionItems.length;
      resultsDisplayHTML = html`
        Here is how people voted:
        <div class="participant-votes-table">
          <div class="table-head">
            <div class="table-row">
              <div class="table-cell">Rank</div>
              ${Object.keys(this.publicData.participantAnswerMap).map(
                (participant) => html`
                  <div class="table-cell">
                    ${getParticipantName(
                      this.cohortService.participantMap[participant]
                    )}
                  </div>
                `
              )}
            </div>
          </div>
          <div class="table-body">
            ${[...Array(maxOptions).keys()].map(
              (rowIndex) => html`
                <div class="table-row">
                  <div class="table-cell">${rowIndex + 1}</div>
                  ${Object.keys(this.publicData!.participantAnswerMap).map(
                    (participant) => {
                      const votedItems = this.publicData!.participantAnswerMap[
                        participant
                      ].map((itemId) => electionIdToText.get(itemId)).filter(
                        (text) => text !== undefined
                      );

                      const itemText = votedItems[rowIndex] || '';
                      return html` <div class="table-cell">${itemText}</div> `;
                    }
                  )}
                </div>
              `
            )}
          </div>
        </div>
      `;
    }

    const electionName = this.experimentService.getStageName(
      this.publicData.id
    );
    return html`
      <h2>Results for ${electionName}</h2>
      ${winnerDisplayHTML} ${resultsDisplayHTML}
      <div class="divider"></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'election-reveal-view': ElectionReveal;
  }
}
