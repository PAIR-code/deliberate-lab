import "../participant_profile/profile_avatar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  ElectionStagePublicData,
} from "@deliberation-lab/utils";
import {
  getParticipantName,
  getParticipantPronouns
} from '../../shared/participant.utils';

import { core } from "../../core/core";
import { CohortService } from "../../services/cohort.service";

import { styles } from "./election_reveal_view.scss";

/** Election reveal */
@customElement("election-reveal-view")
export class ElectionReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);

  @property() publicData: ElectionStagePublicData|undefined = undefined;

  override render() {
    if (!this.publicData) {
      return html`<div class="reveal-wrapper">No election winner.</div>`;
    }

    // TODO: Display participant or winner based on isParticipantElection
    const winner = this.publicData.currentWinner ?? "";
    const leader = this.cohortService.participantMap[winner];

    if (leader === undefined) {
      return html`<div class="reveal-wrapper">No election winner.</div>`;
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
    "election-reveal-view": ElectionReveal;
  }
}