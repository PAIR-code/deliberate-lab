import "../../pair-components/tooltip";
import "../profile/profile_avatar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";

import { styles } from "./progress_end_chat.scss";
import { ParticipantProfile } from "@llm-mediation-experiments/utils";

/** Progress component: Shows how many participants are ready to end chat */
@customElement("progress-end-chat")
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  @property() stageId = "";
  @property() showAvatars = true;

  override render() {
    const { ready, notReady } =
      this.experimentService.getParticipantsReadyToEndChat(this.stageId);

    return html`
      ${this.showAvatars ?
        ready.map(participant => this.renderAvatar(participant)) :
        nothing}
      <div>
        ${ready.length} of ${ready.length + notReady.length}
        participants are ready to move on
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
    "progress-end-chat": Progress;
  }
}
