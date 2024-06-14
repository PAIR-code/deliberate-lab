import "../../pair-components/button";

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

    return html`
      <div><b>Name:</b> ${this.profile.name}</div>
      <div><b>Pronouns:</b> ${this.profile.pronouns}</div>
      <div><b>Current stage:</b> ${this.profile.workingOnStageName}</div>
      <div><b>Terms of Service:</b> ${this.profile.acceptTosTimestamp}</div>
      <div><b>Public ID:</b> ${this.profile.publicId}</div>
      <div><b>Private ID:</b> ${this.profile.privateId}</div>

      <pr-button
        variant="tonal"
        @click=${handlePreview}>
        Preview as participant
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-preview": ProfilePreview;
  }
}
