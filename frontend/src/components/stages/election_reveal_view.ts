import '../participant_profile/profile_avatar';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {ElectionStagePublicData} from '@deliberation-lab/utils';
import {
  getParticipantName,
  getParticipantPronouns,
} from '../../shared/participant.utils';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';

import {styles} from './election_reveal_view.scss';

/** Election reveal */
@customElement('election-reveal-view')
export class ElectionReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);

  @property() publicData: ElectionStagePublicData | undefined = undefined;

  override render() {
    if (!this.publicData) {
      return html`<div class="reveal-wrapper">No election winner.</div>`;
    }

    // TODO: Display participant or winner based on isParticipantElection
    const winner = this.publicData.currentWinner ?? '';
    const leader = this.cohortService.participantMap[winner];
    console.log(this.publicData);
    const electionIdToText = new Map(
      this.publicData.electionItems.map((item) => [item.id, item.text])
    );

    // Infer that this is a winning item.
    if (leader === undefined) {
      const winningItem = this.publicData.electionItems.find(
        (item) => item.id === winner
      );
      if (!winningItem) {
        return html`<div class="reveal-wrapper">An error occurred.</div>`;
      }

      const maxOptions = this.publicData.electionItems.length;
      return html`
        <div class="reveal-wrapper">
          <div class="reveal">
            <h2>The winning item is ${winningItem.text}.</h2>
          </div>
        </div>
        Here is how people voted:
        <div class="participant-votes-table">
        <div class="table-head">
          <div class="table-row">
            <div class="table-cell">#</div>
            ${Object.keys(this.publicData.participantAnswerMap).map(participant => html`
              <div class="table-cell">${getParticipantName(this.cohortService.participantMap[participant])}</div>
            `)}
          </div>
        </div>
        <div class="table-body">
          ${[...Array(maxOptions).keys()].map((rowIndex) => html`
            <div class="table-row">
              <div class="table-cell">${rowIndex + 1}</div>
              ${Object.keys(this.publicData!.participantAnswerMap).map(participant => {
                const votedItems = this.publicData!.participantAnswerMap[participant]
                  .map(itemId => electionIdToText.get(itemId))
                  .filter(text => text !== undefined);
                
                const itemText = votedItems[rowIndex] || '';
                return html`
                  <div class="table-cell">${itemText}</div>
                `;
              })}
            </div>
          `)}
        </div>
      </div>
      `;
    }

    return html`
      <div class="reveal-wrapper">
        <h2>The winner of the election is:</h2>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'election-reveal-view': ElectionReveal;
  }
}
