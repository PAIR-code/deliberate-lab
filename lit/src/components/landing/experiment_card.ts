import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

import { Experiment } from '@llm-mediation-experiments/utils';

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimenterService } from "../../services/experimenter_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./experiment_card.scss";

/** Experiment card component */
@customElement("experiment-card")
export class ExperimentCard extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() experiment: Experiment|null = null;

  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);
  private readonly experimenterService = core.getService(ExperimenterService);

  override render() {
    if (this.experiment === null || !this.authService.isExperimenter) {
      return nothing;
    }

    const handleClick = () => {
      this.routerService.navigate(
        Pages.EXPERIMENT,
        { "experiment": this.experiment!.id }
      );
    }

    const handleDelete = () => {
      this.experimenterService.deleteExperiment(this.experiment!.id);
    };

    return html`
      <h3>${this.experiment.name}</h3>
      <p class="label">${this.experiment.numberOfParticipants} participants</p>
      <p class="label">ID: ${this.experiment.id}</p>
      <div class="action-buttons">
        <pr-button color="secondary" variant="tonal" @click=${handleClick}>
          View experiment
        </pr-button>
        <pr-tooltip text="Delete experiment" position="TOP_END">
          <pr-icon-button
            icon="delete"
            color="error"
            variant="default"
            @click=${handleDelete}>
          </pr-icon-button>
        </pr-tooltip>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-card": ExperimentCard;
  }
}
