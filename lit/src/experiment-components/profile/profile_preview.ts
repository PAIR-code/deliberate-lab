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

    const currentStage = this.routerService.activeRoute.params["stage"];
    const description = this.experimentService.stageConfigMap[currentStage].description;
    const descriptionContent = description ? html`<div class="description">${description}</div>` : '';

    return html`
      ${description} 
      
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

      <pr-button
        color="secondary"
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
