import "../../footer/footer";
import "../../profile/profile_avatar";
import "../../progress/progress_stage_completed";

import '@material/web/radio/radio.js';

import { observable } from "mobx";
import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import {
  ParticipantProfile,
  Vote,
  VoteForLeaderStageAnswer,
  Votes
} from "@llm-mediation-experiments/utils";

import { core } from "../../../core/core";
import { ExperimentService } from "../../../services/experiment_service";
import { ParticipantService } from "../../../services/participant_service";

import { styles } from "./election_preview.scss";

/** Election preview */
@customElement("election-preview")
export class ElectionPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() answer: VoteForLeaderStageAnswer|null = null;

  override render() {
    const disabled = Object.keys(this.answer?.votes ?? []).length <
      this.experimentService.getParticipantProfiles().length - 1;

    return html`
      <div class="election-wrapper">
        ${this.experimentService.getParticipantProfiles().map(profile => 
        this.renderParticipant(profile))}
      </div>
      <stage-footer .disabled=${disabled}>
        <progress-stage-completed></progress-stage-completed>
      </stage-footer>
    `;
  }

  private renderParticipant(profile: ParticipantProfile) {
    if (profile.publicId === this.participantService.profile?.publicId) {
      return nothing;
    }

    const getVoteFromValue = (value: string) => {
      switch (value) {
        case "0":
          return Vote.Positive;
        case "1":
          return Vote.Neutral;
        case "2":
          return Vote.Negative;
        default:
          return Vote.NotRated;
      }
    };

    const handleClick = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;

      const votes: Votes = {};
      votes[profile.publicId] = getVoteFromValue(value);

      this.participantService.updateVoteForLeaderStage(
        this.participantService.profile?.workingOnStageName!,
        votes
      )
    };

    return html`
      <div class="radio-question">
        <div class="question-header">
          <profile-avatar .emoji=${profile.avatarUrl} .square=${true}>
          </profile-avatar>
          <div class="right">
            <div class="title">${profile.name}</div>
            <div class="subtitle">(${profile.pronouns})</div>
          </div>
        </div>
        <div class="radio-buttons-wrapper">
          <div class="radio-button">
            <md-radio
              id="positive"
              name=${profile.publicId}
              value="0"
              aria-label="positive"
              ?checked=${this.answer?.votes[profile.publicId] === "positive"}
              ?disabled=${!this.participantService.isCurrentStage()}
              @change=${handleClick}
            >
            </md-radio>
            <label>positive</label>
          </div>
          <div class="radio-button">
            <md-radio
              id="neutral"
              name=${profile.publicId}
              value="1"
              aria-label="neutral"
              ?checked=${this.answer?.votes[profile.publicId] === "neutral"}
              ?disabled=${!this.participantService.isCurrentStage()}
              @change=${handleClick}
            >
            </md-radio>
            <label>neutral</label>
          </div>
          <div class="radio-button">
            <md-radio
              id="negative"
              name=${profile.publicId}
              value="2"
              aria-label="negative"
              ?checked=${this.answer?.votes[profile.publicId] === "negative"}
              ?disabled=${!this.participantService.isCurrentStage()}
              @change=${handleClick}
            >
            </md-radio>
            <label>negative</label>
          </div>
          <div class="radio-button">
            <md-radio
              id="none"
              name=${profile.publicId}
              value="3"
              aria-label="no rating"
              ?checked=${this.answer?.votes[profile.publicId] === "not-rated"}
              ?disabled=${!this.participantService.isCurrentStage()}
              @change=${handleClick}
            >
            </md-radio>
            <label>no rating</label>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "election-preview": ElectionPreview;
  }
}
