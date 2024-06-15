import "../../footer/footer";
import "../../profile/profile_avatar";

import '@material/web/radio/radio.js';

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  StageKind,
} from "@llm-mediation-experiments/utils";

import { core } from "../../../core/core";
import { ExperimentService } from "../../../services/experiment_service";

import { styles } from "./election_reveal.scss";

/** Election reveal */
@customElement("election-reveal")
export class ElectionReveal extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  @property() voteStageName = "";

  override render() {
    const stage = this.experimentService.publicStageDataMap[this.voteStageName];

    if (stage?.kind !== StageKind.VoteForLeader) {
      return nothing;
    }

    const leaderPublicId = stage.currentLeader;
    const leader = this.experimentService.participants.find(
      participant => participant.publicId === leaderPublicId
    );

    if (leader === undefined) {
      return nothing;
    }

    return html`
      <div class="reveal-wrapper">
        <h2>Your elected leader is:</h2>
        <div class="reveal">
          <profile-avatar .emoji=${leader.avatarUrl} .square=${true}>
          </profile-avatar>
          <div class="info">
            <div class="title">${leader.name}</div>
            <div class="subtitle">(${leader.pronouns})</div>
          </div>
        </div>
      </div>
      <stage-footer></stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "election-reveal": ElectionReveal;
  }
}
