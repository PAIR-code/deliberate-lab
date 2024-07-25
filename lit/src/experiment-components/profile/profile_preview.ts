import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/menu";
import "../../pair-components/tooltip";

import "./profile_avatar";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentService } from "../../services/experiment_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { ParticipantService } from "../../services/participant_service";
import { Pages, RouterService } from "../../services/router_service";

import { Experiment, ParticipantProfileExtended, UnifiedTimestamp } from "@llm-mediation-experiments/utils";
import { convertUnifiedTimestampToDate } from "../../shared/utils";

import { styles } from "./profile_preview.scss";

/** Full participant profile preview */
@customElement("profile-preview")
export class ProfilePreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() profile: ParticipantProfileExtended | null = null;
  @property() availableTransferExperiments: Experiment[] = [];

  /** Copy a link to this participant's experiment view to the clipboard */
  async copyParticipantLink() {
    const basePath = window.location.href.substring(0, window.location.href.indexOf('/#'));
    const link = `${basePath}/#/${this.experimentService.experiment?.id}/${this.profile?.privateId}`;

    await navigator.clipboard.writeText(link);
    alert("Link copied to clipboard!");
  }

  private renderTransferExperimentItem(experiment: Experiment) {
    const onTransferClick = () => {
      this.experimenterService.transferParticipant(
        this.experimentService.id!, experiment!.id, this.profile!
      );
    };

    return html`
      <div class="menu-item" role="button" @click=${onTransferClick}>
        <div>${experiment.name}</div>
      </div>
    `;
  }

  private renderTransferMenu() {
    if (!this.profile?.transferConfig &&
        this.availableTransferExperiments.length > 0
    ) {
      return html`
      <pr-menu name="Transfer">
        <div class="menu-wrapper">
          ${this.availableTransferExperiments.map(experiment =>
            this.renderTransferExperimentItem(experiment))}
        </div>
      </pr-menu>
      `;
    }
    return nothing;
  }

  renderDeleteButton() {
    if (!this.authService.canEdit) {
      return nothing;
    }

    const onDelete = () => {
      this.experimenterService.deleteParticipant(
        this.experimentService.id ?? '',
        this.profile?.privateId ?? '',
      );
    };

    return html`
      <pr-tooltip text="Delete participant" position="BOTTOM_END">
        <pr-icon-button
          icon="delete"
          color="error"
          variant="default"
          @click=${onDelete}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  override render() {
    console.log(this.availableTransferExperiments)
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
        this.routerService.setExperimenterNav(false);
      }
    };

    const formatDate = (timestamp: UnifiedTimestamp | null) => {
      if (timestamp) {
        return convertUnifiedTimestampToDate(timestamp);
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
        ${this.renderDeleteButton()}
      </div>

      <div>
        <span>Current stage:</span>
        ${this.experimentService.getStageName(this.profile.currentStageId, true)}
      </div>
      <div>
        <span>Accepted TOS:</span>
        ${formatDate(this.profile?.acceptTosTimestamp)}
      </div>
      <div>
        <span>Completed:</span>
        ${formatDate(this.profile?.completedExperiment)}
      </div>
      <div><span>Public ID:</span> ${this.profile.publicId}</div>
      <div><span>Private ID:</span> ${this.profile.privateId}</div>

      <div class="row">
        ${this.renderTransferMenu()}
        <pr-tooltip text="Preview as participant" position="TOP_END">
          <pr-icon-button
            icon="visibility"
            color="primary"
            variant="default"
            @click=${handlePreview}>
          </pr-button>
        </pr-tooltip>
        <pr-tooltip text="Copy participant link" position="TOP_END">
          <pr-icon-button
            icon="content_copy"
            color="secondary"
            variant="default"
            @click=${this.copyParticipantLink}
          >
          </pr-icon-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "profile-preview": ProfilePreview;
  }
}
