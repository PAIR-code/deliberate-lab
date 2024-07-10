import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

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
  private readonly experimentConfig = core.getService(ExperimentConfigService);
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
          experiment => this.renderExperimentCard(experiment)
        )}
      </div>
    `;
  }
  private renderDelete(experiments: Experiment[]) {
    const onDelete = () => {
      experiments.forEach(experiment => {
        this.experimenterService.deleteExperiment(experiment.id);
      });
    };
    return html`
    <pr-tooltip text="Delete group" position="BOTTOM_END">
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

  private renderExperimentCard(experiment: Experiment) {
    const handleClick = () => {
      this.routerService.navigate(
        Pages.EXPERIMENT,
        { "experiment": experiment.id }
      );
    }

    const handleDelete = () => {
      this.experimenterService.deleteExperiment(experiment.id);
    };

    return html`
      <div class="card">
        <h3>${experiment.name}</h3>
        <p class="label">${experiment.numberOfParticipants} participants</p>
        <p class="label">ID: ${experiment.id}</p>
        <div class="action-buttons">
          <pr-button variant="default" @click=${handleClick}>
            View experiment
          </pr-button>
          <pr-tooltip text="Delete experiment" position="BOTTOM_END">
            <pr-icon-button
              icon="delete"
              color="error"
              variant="default"
              @click=${handleDelete}>
            </pr-icon-button>
          </pr-tooltip>
        </div>
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-group-page": ExperimentGroup;
  }
}
