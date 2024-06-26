import "../../pair-components/tooltip";
import "../profile/profile_avatar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";
import { RouterService } from "../../services/router_service";

import { styles } from "./progress_end_chat.scss";
import { ParticipantProfile } from "@llm-mediation-experiments/utils";

/** Progress component: Shows how many participants completed the stage */
@customElement("progress-stage-completed")
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() showAvatars = true;
  @property() stageName = this.routerService.activeRoute.params["stage"];

  override render() {
    const { completed, notCompleted } =
      this.experimentService.getParticipantsCompletedStage(this.stageName);

    return html`
      ${this.showAvatars ?
        completed
          .sort((p1, p2) => p1.publicId.localeCompare(p2.publicId))
          .map(participant => this.renderAvatar(participant)) :
        nothing}
      <div>
        ${completed.length} of ${completed.length + notCompleted.length}
        participants completed this stage
      </div>
    `;
  }

  private renderAvatar(participant: ParticipantProfile) {
    const label = `
      ${participant.name ?? participant.publicId}
      ${participant.pronouns ? `(${participant.pronouns})` : ""}
    `;

    return html`
      <pr-tooltip text=${label}>
        <profile-avatar .emoji=${participant.avatarUrl} .small=${true}>
        </profile-avatar>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "progress-stage-completed": Progress;
  }
}
