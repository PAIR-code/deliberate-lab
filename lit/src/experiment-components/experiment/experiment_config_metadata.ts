import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth_service';
import {ExperimentConfigService} from '../../services/config/experiment_config_service';
import {RouterService} from '../../services/router_service';

import {ExperimenterService} from '../../services/experimenter_service';
import {styles} from './experiment_config_metadata.scss';

/** Metadata for experiment config page */
@customElement('experiment-config-metadata')
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
      ${this.renderExperimentDetailFields()} ${this.renderGroupToggle()}
      ${this.renderConstrainParticipantsToggle()} ${this.renderProlificLogic()}
    `;
  }

  private renderExperimentDetailFields() {
    return html`
      <h2>📕 Metadata</h2>
      ${this.renderNameFields()} ${this.renderDescriptionField()}
      <div class="divider"></div>
    `;
  }
  private renderDescriptionField() {
    const handleDescription = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateDescription(value);
    };

    return html`
      <pr-textarea
        label="Internal experiment description"
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
      <div class="number-input tab">
        <label for="num">Maximum participants</label>
        <input
          type="number"
          id="num"
          njkime="numParticipants"
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
        return 'Internal experiment group name*';
      }
      return 'Internal experiment name*';
    };

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
        placeholder="Internal experiment name"
        }
        variant="outlined"
        class="required"
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
      <h2>📚 Experiment group configuration</h2>

      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox
            id="isExperimentGroup"
            touch-target="wrapper"
            .checked=${this.experimentConfig.isGroup}
            @change=${handleGroupCheckbox}
          ></md-checkbox>
          <label for="isExperimentGroup">
            <div>Create experiment group</div>
            <div class="subtitle">
              Create a group of experiments with identical settings.
            </div>
          </label>
        </div>
      </div>
      ${this.experimentConfig.isGroup ? this.renderGroupConfig() : ''}
      <div class="divider"></div>
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
      <h2>👥 Participant management</h2>
      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox
            id="constrainMaxParticipants"
            touch-target="wrapper"
            .checked=${this.experimentConfig.hasMaxNumParticipants}
            @change=${handleConstrainToggle}
          ></md-checkbox>
          <label for="constrainMaxParticipants">
            <div>Limit participant enrollment</div>
            <div class="subtitle">
              Restrict the total number of participants for the experiment.
            </div>
          </label>
        </div>
      </div>

      ${this.experimentConfig.hasMaxNumParticipants
        ? html`
            ${this.renderNumMaxParticipantsField()}
            ${this.renderWaitForAllToStartToggle()}
          `
        : ''}

      <div class="divider"></div>
    `;
  }

  private renderProlificLogic() {
    const handleIsProlific = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsProlific(checked);
    };

    return html`
      <h2>🌅 Prolific integration</h2>
      <div class="checkbox-input-container">
        <div class="checkbox-input">
          <md-checkbox
            id="isProlific"
            touch-target="wrapper"
            .checked=${this.experimentConfig.isProlific}
            @change=${handleIsProlific}
          ></md-checkbox>
          <label for="waitForAll">
            <div>
              Host on Prolific
              <div class="subtitle">
                Enable integration with Prolific for this experiment.
              </div>
            </div>
          </label>
        </div>
      </div>

      ${this.experimentConfig.isProlific
        ? html` ${this.renderProlificCodeField()}`
        : ''}
      <div class="divider"></div>
    `;
  }

  private renderProlificCodeField() {
    const handleCode = (e: Event) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.experimentConfig.updateProlificRedirectCode(value);
    };

    return html`
      <pr-textarea
        label="Prolific completion code"
        placeholder="This code will redirect participants to Prolific"
        variant="outlined"
        .value=${this.experimentConfig.prolificRedirectCode}
        @input=${handleCode}
      >
      </pr-textarea>
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
          <md-checkbox
            id="waitForAll"
            touch-target="wrapper"
            .checked=${this.experimentConfig.waitForAllToStart}
            @change=${handleStartToggle}
          ></md-checkbox>
          <label for="waitForAll">
            <div>Wait for full enrollment</div>
            <div class="subtitle">
              Ensure the experiment starts only when all participants have
              joined.
            </div>
          </label>
        </div>
      </div>
    `;
  }

  private renderGroupConfig() {
    const handleGroupNum = (e: Event) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentConfig.updateNumExperiments(num);
    };

    const handleMultiPartCheckbox = (e: Event) => {
      const checked = Boolean((e.target as HTMLInputElement).checked);
      this.experimentConfig.updateIsMultiPart(checked);
    };

    return html`
      <div class="number-input tab">
        <label for="num">Number of experiments in group</label>
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
        <md-checkbox
          id="isExperimentGroup"
          touch-target="wrapper"
          .checked=${this.experimentConfig.isMultiPart}
          @change=${handleMultiPartCheckbox}
        ></md-checkbox>
        <label for="isExperimentGroup">
          <div>Create muti-part experiment</div>
          <div class="subtitle">
            Add a "lobby" stage to divide your experiment into two parts. You
            can redirect people to the second part of the experiment.
          </div>
        </label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-config-metadata': ExperimentConfig;
  }
}
