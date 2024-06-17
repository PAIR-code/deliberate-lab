import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { Experiment, ExperimentTemplate } from '@llm-mediation-experiments/utils';

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { FirebaseService } from "../../services/firebase_service";
import { Pages, RouterService } from "../../services/router_service";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";

import { StageKind } from "@llm-mediation-experiments/utils";

import { styles } from "./home.scss";
import { ExperimenterService } from "../../services/experimenter_service";

/** Home page component */
@customElement("home-page")
export class Home extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly routerService = core.getService(RouterService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly experimentConfig = core.getService(ExperimentConfigService);

  override render() {
    if (!this.authService.isExperimenter) {
      return html`<div>403: Participants do not have access</div>`;
    }

    return html`
      <h2>Experiments</h2>
      <div class="cards-wrapper">
        ${this.experimenterService.experiments.length === 0 ?
          html`<div class="label">No experiments yet</div>` : nothing}
        ${this.experimenterService.experiments.map(
          experiment => this.renderExperimentCard(experiment)
        )}
      </div>
      <h2>Templates</h2>
      <div class="cards-wrapper">
        ${this.experimenterService.templates.length === 0 ?
          html`<div class="label">No templates yet</div>` : nothing}
        ${this.experimenterService.templates.map(
          template => this.renderTemplateCard(template)
        )}
      </div>
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

  private renderTemplateCard(template: ExperimentTemplate) {
    const handleClick = () => {
      this.experimentConfig.loadTemplate(template.id, template.name);
      this.routerService.navigate(Pages.EXPERIMENT_CREATE);
    }

    const handleDelete = () => {
      this.experimenterService.deleteTemplate(template.id);
    };

    return html`
      <div class="card">
        <h3>${template.name}</h3>
        <p class="label">ID: ${template.id}</p>
        <div class="action-buttons">
          <pr-button variant="default" @click=${handleClick}>
            Use template
          </pr-button>
          <pr-tooltip text="Delete template" position="BOTTOM_END">
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
    "home-page": Home;
  }
}
