import "../../pair-components/button";
import "../../pair-components/icon_button";
import "../../pair-components/textarea";
import "../../pair-components/tooltip";

import "@material/web/checkbox/checkbox.js";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { AuthService } from "../../services/auth_service";
import { ExperimentConfigService } from "../../services/config/experiment_config_service";
import { RouterService } from "../../services/router_service";

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

    return html`
      ${this.renderGroupToggle()}
      ${this.renderNameFields()}
      ${this.renderDescriptionField()}
      ${this.renderGroupConfig()}
      ${this.renderConstrainParticipantsToggle()}
    `;
  }

  private renderDescriptionField() {
    const handleDescription = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateDescription(value);
    }

    return html`
      <pr-textarea
        label="Private experiment description"
        placeholder="This description is only visible to experimenters"
        variant="outlined"
        .value=${this.experimentConfig.description}
        @input=${handleDescription}
      >
      </pr-textarea>
    `;
  }

  private renderNumMaxParticipantsField() {
    const handleNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentConfig.updateNumMaxParticipants(num);
    };

    return html`
      <div class="number-input">
        <label for="num">Maximum number of participants</label>
        <input
          type="number"
          id="num"
          name="numParticipants"
          min="0"
          placeholder="Leave this blank if there is no threshold"
          .value=${this.experimentConfig.numMaxParticipants}
          @input=${handleNum}
        />
      </div>
    `;
  }

  private renderNameFields() {
    const handleName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateName(value);
    };

    const handlePublicName = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updatePublicName(value);
    };

    const getExperimentNameLabel = () => {
      if (this.experimentConfig.isGroup) {
        return "Private experiment group prefix";
      }
      return "Private experiment name";
    }

    return html`
      <pr-textarea
        label="Public experiment name (visible to participants)"
        placeholder="Public experiment name"
        variant="outlined"
        .value=${this.experimentConfig.publicName}
        @input=${handlePublicName}
      >
      </pr-textarea>
      <pr-textarea
        label=${getExperimentNameLabel()}
        placeholder=${getExperimentNameLabel()}
        variant="outlined"
        .value=${this.experimentConfig.name}
        @input=${handleName}
      >
      </pr-textarea>
    `;
  }

  private renderGroupToggle() {
    const handleGroupCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsExperimentGroup(checked);
    };

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
    `;
  }
   
  private renderConstrainParticipantsToggle() {
    const handleConstrainToggle = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateHasMaxNumParticipants(checked);
      if (!checked) {
        this.experimentConfig.resetHasMaxNumParticipants();
      }
    };

    return html`
      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox id="constrainMaxParticipants" touch-target="wrapper"
            .checked=${this.experimentConfig.hasMaxNumParticipants}
            @change=${handleConstrainToggle}
          ></md-checkbox>
          <label for="constrainMaxParticipants">
            <div>Limit the number of participants</div>
          </label>
        </div>
      </div>
    
      ${this.experimentConfig.hasMaxNumParticipants ? 
        html`
          ${this.renderNumMaxParticipantsField()}
          ${this.renderWaitForAllToStartToggle()}
        `: ''}
    `;
  }

  private renderWaitForAllToStartToggle() {
    const handleStartToggle = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateWaitForAllToStart(checked);
    };

    return html`
      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox id="waitForAll" touch-target="wrapper"
            .checked=${this.experimentConfig.waitForAllToStart}
            @change=${handleStartToggle}
          ></md-checkbox>
          <label for="waitForAll">
            <div>Wait for all participants to join before allowing the experiment to start</div>
          </label>
        </div>
      </div>
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
      <div class="divider"></div>
      <h2>Group-specific settings</h2>
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
