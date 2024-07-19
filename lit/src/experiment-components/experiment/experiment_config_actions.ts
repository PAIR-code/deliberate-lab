import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/tooltip";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";
import { ExperimenterService } from "../../services/experimenter_service";

import { styles } from "./experiment_config_actions.scss";

/** Bottom action buttons for experiment config page*/
@customElement("experiment-config-actions")
export class ExperimentConfig extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentConfig = core.getService(ExperimentConfigService);
  private readonly authService = core.getService(AuthService);
  private readonly experimenterService = core.getService(ExperimenterService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const onClear = () => {
      this.experimentConfig.reset();
    }

    return html`
      <pr-button variant="default" @click=${onClear}>
        Clear
      </pr-button>
      ${this.renderCreateTemplateButton()}
      ${this.renderCreateExperimentButton()}
    `;
  }

  private renderCreateTemplateButton() {
    const onCreateTemplate = async () => {
      const { name, publicName, stages, numberOfParticipants } =
        this.experimentConfig.getExperiment();

      await this.experimenterService.createTemplate(
        {
          name,
          publicName,
        }, stages
      );

      this.experimentConfig.reset();
    };

    return html`
      <pr-button variant="tonal" @click=${onCreateTemplate}>
        Create template
      </pr-button>
    `;
  }

  private renderCreateExperimentButton() {
    const createExperiments = async () => {
      const experiments = this.experimentConfig.getExperiments() || [];
      for (let i = 0; i < experiments.length; i++) {
        const { name, publicName, stages, numberOfParticipants, group } = experiments[i];
        const experiment = await this.experimenterService.createExperiment(
          {
            name,
            publicName,
            numberOfParticipants,
            group,
          },
          stages
        );

        // Navigate if this is the last created experiment.
        if (i === experiments.length - 1) {
          if (group) {
            this.routerService.navigate(
              Pages.EXPERIMENT_GROUP,
              { "experiment_group": group }
            );
          } else {
            this.routerService.navigate(
              Pages.EXPERIMENT,
              { "experiment": experiment.id }
            );
          }
        }
      }

      this.experimentConfig.reset();
    };

    const onCreateExperiment = async () => {
      const errors = this.experimentConfig.getExperimentErrors();
      if (errors.length > 0) {
        console.log(errors);
        return;
      }
      createExperiments();
    };

    const hasErrors = this.experimentConfig.getExperimentErrors().length > 0;
    const tooltipText = hasErrors ? "Resolve errors to create experiment" : "";

    return html`
      <pr-tooltip text=${tooltipText} position="TOP_END">
        <pr-button @click=${onCreateExperiment}>
          ${this.experimentConfig.isGroup ? 'Create experiment group' : 'Create experiment'}
        </pr-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config-actions": ExperimentConfig;
  }
}
