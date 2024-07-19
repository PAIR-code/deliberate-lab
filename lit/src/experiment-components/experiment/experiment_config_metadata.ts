import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "@material/web/checkbox/checkbox.js";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { AuthService } from "../../services/auth_service";
import { Pages, RouterService } from "../../services/router_service";

import { ExperimenterService } from "../../services/experimenter_service";
import { styles } from "./experiment_config_metadata.scss";

/** Metadata for experiment config page */
@customElement("experiment-config-metadata")
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

    const handleName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateName(value);
    };

    const handlePublicName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updatePublicName(value);
    }

    const handleNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentConfig.updateNumParticipants(num);
    };

    const handleGroupCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsExperimentGroup(checked);
    };

    const getExperimentNameLabel = () => {
      if (this.experimentConfig.isGroup) {
        return "Private experiment group prefix";
      }
      return "Private experiment name";
    }

    return html`
      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox id="isExperimentGroup" touch-target="wrapper"
            .checked=${this.experimentConfig.isGroup}
            @change=${handleGroupCheckbox}
          ></md-checkbox>
          <label for="isExperimentGroup">
            <div>Create a group of experiments</div>
            <div class="subtitle">The experiment group options allow you to create a group of experiments with the same configuration.</div>
          </label>
        </div>
      </div>
      <pr-textarea
        label=${getExperimentNameLabel()}
        placeholder=${getExperimentNameLabel()}
        variant="outlined"
        .value=${this.experimentConfig.name}
        @input=${handleName}
      >
      </pr-textarea>
      <pr-textarea
        label="Public experiment name (visible to participants)"
        placeholder="Public experiment name"
        variant="outlined"
        .value=${this.experimentConfig.publicName}
        @input=${handlePublicName}
      >
      </pr-textarea>
      <div class="number-input">
        <label for="num">Number of participants</label>
        <input
          type="number"
          id="num"
          name="numParticipants"
          min="0"
          .value=${this.experimentConfig.numParticipants}
          @input=${handleNum}
        />
      </div>
      ${this.renderGroupConfig()}
    `;
  }

  private renderGroupConfig() {
    if (!this.experimentConfig.isGroup) {
      return nothing;
    }

    const handleGroupNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentConfig.updateNumExperiments(num);
    };

    const handleMultiPartCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsMultiPart(checked);
    };

    return html`
      <div class="number-input">
        <label for="num">Number of experiments</label>
        <input
          type="number"
          id="numExperiments"
          name="numExperiments"
          min="1"
          .value=${this.experimentConfig.numExperiments}
          @input=${handleGroupNum}
        />
      </div>
      <div class="checkbox-input">
        <md-checkbox id="isExperimentGroup" touch-target="wrapper"
          .checked=${this.experimentConfig.isMultiPart}
          @change=${handleMultiPartCheckbox}
        ></md-checkbox>
        <label for="isExperimentGroup">
          <div>Create a muti-part experiment</div>
          <div class="subtitle">
            This will add a "lobby" stage; move the stage to divide your experiment into two parts. A lobby experiment will be created for the first part. You can redirect people to the second experiment.
          </div>
        </label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "experiment-config-metadata": ExperimentConfig;
  }
}
