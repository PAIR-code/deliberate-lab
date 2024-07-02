import "../profile/profile_avatar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";

import { ParticipantProfile } from "@llm-mediation-experiments/utils";
import { styles } from "./progress_stage_waiting.scss";

/** Progress component: Shows how many participants are ready to begin stage */
@customElement("progress-stage-waiting")
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);

  @property() stageName = "";
  @property() showReadyAvatars = true;
  @property() showWaitingAvatars = false;

  override render() {
    const { ready, notReady } =
      this.experimentService.getParticipantsReadyForStage(this.stageName);

    return html`
      <div class="status">
        <h2 class="secondary">
          <div class="chip secondary">Waiting on</div>
          <div>${notReady.length} participants</div>
        </h2>
        ${this.showWaitingAvatars ? this.renderParticipants(notReady) : nothing}
      </div>
      <div class="divider"></div>
      <div class="status">
        <h2 class="secondary">
          <div class="chip secondary">Ready</div>
          <div>${ready.length} participants</div>
        </h2>
        ${this.showReadyAvatars ? this.renderParticipants(ready) : nothing}
      </div>
    `;
  }

  private renderParticipants(participants: ParticipantProfile[]) {
    const renderParticipant = (participant: ParticipantProfile) => {
      return html`
        <div class="participant">
          <profile-avatar .emoji=${participant.avatarUrl}></profile-avatar>
          <div>
            ${participant.name ?? participant.publicId}
            <br/>
            (${participant.pronouns})
          </div>
        </div>
      `;
    };

    return html`
      <div class="participants-wrapper">
        ${participants.map(p => renderParticipant(p))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "progress-stage-waiting": Progress;
  }
}
