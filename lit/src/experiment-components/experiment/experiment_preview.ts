import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import "../profile/profile_preview";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { ExperimentService } from "../../services/experiment_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./experiment_preview.scss";

/** Experiment preview */
@customElement("experiment-preview")
export class ExperimentPreview extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly routerService = core.getService(RouterService);
  private readonly experimentConfig = core.getService(ExperimentConfigService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>403: Participants cannot access this page</div>`;
    }

    const addParticipant = () => {
      this.experimenterService.createParticipant(this.experimentService.id!);
    };

    return html`
      <div class="top-bar">
        <div class="stat">
          ${this.experimentService.experiment?.numberOfParticipants}
          participants
        </div>
        <div class="right">
          ${this.renderFork()}
          ${this.renderDownload()}
          ${this.renderDelete()}
        </div>
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
          html`<profile-preview .profile=${participant}></profile-preview>`)}
      </div>
    `;
  }

  private renderDelete() {
    const onDelete = () => {
      this.experimenterService.deleteExperiment(this.experimentService.id!);
      this.routerService.navigate(Pages.HOME);
    };

    return html`
      <pr-tooltip text="Delete experiment" position="BOTTOM_END">
        <pr-icon-button
          icon="delete"
          color="error"
          variant="tonal"
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
