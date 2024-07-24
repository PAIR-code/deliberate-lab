import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import "../profile/profile_preview";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { ExperimentService } from "../../services/experiment_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { ParticipantService } from "../../services/participant_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./experiment_preview.scss";

/** Experiment preview */
@customElement("experiment-preview")
export class ExperimentPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly participantService = core.getService(ParticipantService);

  private readonly routerService = core.getService(RouterService);
  private readonly experimentConfig = core.getService(ExperimentConfigService);

  /** Copy a link to this participant's experiment view to the clipboard */
  async copyExperimentLink() {
    const basePath = window.location.href.substring(0, window.location.href.indexOf('/#'));
    const link = `${basePath}/#/${this.experimentService.experiment?.id}/`;

    await navigator.clipboard.writeText(link);
    alert("Link copied to clipboard!");
  }

  override render() {
    const addParticipant = async () => {
      try {
        const response = await this.experimenterService.createParticipant(this.experimentService.id!);
        return response.participant;
      } catch (error) {
        console.error('Error creating participant:', error);
        throw error;
      }
    };

    const joinExperiment = async () => {
      // Create the participant.
      const participant = await Promise.all([addParticipant()]);

      this.participantService.setParticipant(
        this.experimentService.id,
        participant[0].privateId
      );

      // Redirect.
      this.routerService.navigate(
        Pages.PARTICIPANT,
        {
          "experiment": this.experimentService.id!,
          "participant": participant[0].privateId
        }
      );
      this.routerService.setExperimenterNav(false);
    };

    if (!this.authService.isExperimenter) {
      return html`
      <div class="row">
        <pr-button
          color="tertiary"
          variant="tonal"
          @click=${joinExperiment}>
          Join experiment
        </pr-button>
      </div>
      `;
    }

    const getTransferableExperiments = () => {
      const group = this.experimentService.experiment?.group!;
      const currentExperimentName = this.experimentService.experiment?.name;
      const experiments = this.experimenterService.getExperimentsInGroup(group)
        .filter(experiment => experiment.name !== currentExperimentName);

      return experiments;
    };

    return html`
      <div class="top-bar">
        <div class="left">
          <div class="stat">
            ${this.experimentService.experiment?.numberOfParticipants}
            participants
          </div>
          <div class="stat small">
            Public name: ${this.experimentService.experiment?.publicName}
          </div>
          ${this.renderGroup()}
        </div>
        <div class="right">
          ${this.renderShare()}
          ${this.renderFork()}
          ${this.renderDownload()}
          ${this.renderDelete()}
        </div>
      </div>
      <div class="row">
        ${this.experimentService.experiment?.description}
      </div>
      
      <div class="row">
        <pr-button
          color="tertiary"
          variant="tonal"
          @click=${addParticipant}>
          Add participant
        </pr-button>
      </div>
      <div class="profile-wrapper">
        ${this.experimentService.privateParticipants.map(participant =>
      html`<profile-preview .profile=${participant} .availableTransferExperiments=${getTransferableExperiments()}></profile-preview>`)}
      </div>
    `;
  }

  private renderGroup() {
    if (!this.experimentService.experiment || !this.experimentService.experiment.group) {
      return nothing;
    }

    const navigateToGroup = () => {
      if (this.experimentService.experiment!.group) {
        this.routerService.navigate(
          Pages.EXPERIMENT_GROUP,
          { "experiment_group": this.experimentService.experiment!.group }
        );
        this.authService.setEditPermissions(false);
      }
    };

    return html`
      <div class="stat small">
        <div>Group:</div>
        <div class="chip" role="button" @click=${navigateToGroup}>
          ${this.experimentService.experiment.group}
        </div>
      </div>
    `;
  }

  private renderDelete() {
    if (!this.authService.canEdit) {
      return nothing;
    }

    const onDelete = () => {
      this.experimenterService.deleteExperiment(this.experimentService.id!);
      this.routerService.navigate(Pages.HOME);
      this.authService.setEditPermissions(false);
    };

    return html`
      <pr-tooltip text="Delete experiment" position="BOTTOM_END">
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

  private renderDownload() {
    const onDownload = () => {
      this.experimentService.downloadExperiment();
    };

    return html`
      <pr-tooltip text="Download experiment JSON" position="BOTTOM_END">
        <pr-icon-button
          icon="download"
          color="secondary"
          variant="tonal"
          @click=${onDownload}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderShare() {
    const onFork = () => {
      const name = this.experimentService.experiment?.name!;
      const num = this.experimentService.experiment?.numberOfParticipants!;
      const stages = this.experimentService.stageIds.map(stageId =>
        this.experimentService.stageConfigMap[stageId]
      );

      this.experimentConfig.updateName(name);
      this.experimentConfig.updateNumParticipants(num);
      this.experimentConfig.updateStages(stages);

      this.routerService.navigate(Pages.EXPERIMENT_CREATE);
    };

    return html`
      <pr-tooltip text="Copy link to join experiment" position="BOTTOM_END">
        <pr-icon-button
          icon="share"
          color="primary"
          variant="tonal"
          @click=${this.copyExperimentLink}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderFork() {
    const onFork = () => {
      const name = this.experimentService.experiment?.name!;
      const num = this.experimentService.experiment?.numberOfParticipants!;
      const stages = this.experimentService.stageIds.map(stageId =>
        this.experimentService.stageConfigMap[stageId]
      );

      this.experimentConfig.updateName(name);
      this.experimentConfig.updateNumParticipants(num);
      this.experimentConfig.updateStages(stages);

      this.routerService.navigate(Pages.EXPERIMENT_CREATE);
    };

    return html`
      <pr-tooltip text="Fork experiment" position="BOTTOM_END">
        <pr-icon-button
          icon="fork_right"
          color="primary"
          variant="tonal"
          @click=${onFork}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-preview": ExperimentPreview;
  }
}
