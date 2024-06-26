import "../../pair-components/button";

import "./profile_avatar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";
import { Pages, RouterService } from "../../services/router_service";

import { ParticipantProfileExtended } from "@llm-mediation-experiments/utils";

import { styles } from "./profile_preview.scss";

/** Full participant profile preview */
@customElement("profile-preview")
export class ProfilePreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() profile: ParticipantProfileExtended|null = null;

  /** Copy a link to this participant's experiment view to the clipboard */ 
  async copyParticipantLink() {
    const link = `${window.location.origin}/#/${this.experimentService.experiment?.id}/${this.profile?.privateId}`;

    await navigator.clipboard.writeText(link);
    alert("Link copied to clipboard!");
  }

  override render() {
    if (!this.profile) {
      return nothing;
    }

    const handlePreview = () => {
      if (this.profile && this.experimentService.id) {
        this.participantService.setParticipant(
          this.experimentService.id,
          this.profile.privateId
        );
        this.routerService.navigate(
          Pages.PARTICIPANT,
          {
            "experiment": this.experimentService.id,
            "participant": this.profile.privateId
          }
        );
      }
    };

    const formatDate = () => {
      const timestamp = this.profile?.acceptTosTimestamp;
      if (timestamp) {
        return new Date(timestamp.seconds * 1000);
      }
      return "";
    }

    return html`
      <div class="profile">
        <profile-avatar .emoji=${this.profile.avatarUrl}></profile-avatar>
        <div class="right">
          <div class="title">${this.profile.name ?? this.profile.publicId}</div>
          <div class="subtitle">${this.profile.pronouns}</div>
        </div>
      </div>

      <div><span>Current stage:</span> ${this.profile.workingOnStageName}</div>
      <div>
        <span>Terms of Service:</span> ${formatDate()}</div>
      <div><span>Public ID:</span> ${this.profile.publicId}</div>
      <div><span>Private ID:</span> ${this.profile.privateId}</div>

      <div class="row" >
        <pr-button
          color="primary"
          variant="tonal"
          @click=${handlePreview}>
          Preview as participant
        </pr-button>

        <pr-button
          color="secondary"
          variant="tonal"
          @click=${this.copyParticipantLink}
        >
          Copy participant link
        </pr-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-preview": ProfilePreview;
  }
}
