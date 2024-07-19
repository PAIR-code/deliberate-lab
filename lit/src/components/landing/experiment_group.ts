import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import "./experiment_card";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { Experiment } from '@llm-mediation-experiments/utils';

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { Pages, RouterService } from "../../services/router_service";


import { ExperimenterService } from "../../services/experimenter_service";
import { styles } from "./experiment_group.scss";

/** Experiment group page*/
@customElement("experiment-group-page")
export class ExperimentGroup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);
  private readonly experimenterService = core.getService(ExperimenterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>403: Participants do not have access</div>`;
    }

    const group = this.routerService.activeRoute.params["experiment_group"];
    const experiments = this.experimenterService.getExperimentsInGroup(group);

    return html`
      <div class="top-bar">
        <div class="stat">
          ${experiments.length} experiments
        </div>

        <div class="right">
          ${this.renderDelete(experiments)}
        </div>
      </div>

      <div class="cards-wrapper">
        ${experiments.length === 0 ?
          html`<div class="label">No experiments yet</div>` : nothing}
        ${experiments.map(
          experiment => html`<experiment-card .experiment=${experiment}></experiment-card>`
        )}
      </div>
    `;
  }
  private renderDelete(experiments: Experiment[]) {
    if (!this.authService.canEdit) {
      return nothing;
    }

    const onDelete = () => {
      experiments.forEach(experiment => {
        this.experimenterService.deleteExperiment(experiment.id);
      });

      this.routerService.navigate(
        Pages.HOME,
      );
      this.authService.setEditPermissions(false);
    };
    return html`
    <pr-tooltip text="Delete group" position="BOTTOM_END">
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
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-group-page": ExperimentGroup;
  }
}
