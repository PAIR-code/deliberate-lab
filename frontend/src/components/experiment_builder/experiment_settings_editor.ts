import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ButtonClick, AnalyticsService} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';

import {Visibility} from '@deliberation-lab/utils';

import {styles} from './experiment_settings_editor.scss';

/** Editor for adjusting experiment settings */
@customElement('experiment-settings-editor')
export class ExperimentSettingsEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    return html`
      ${this.renderMetadata()}
      <div class="divider"></div>
      ${this.renderPermissions()}
      <div class="divider"></div>
      ${this.renderCohortParticipantConfig()}
      <div class="divider"></div>
      ${this.renderProlificConfig()}
      <div class="spacer"></div>
      <pr-button
        color="error"
        variant="tonal"
        ?disabled=${!this.experimentManager.isCreator}
        @click=${() => {
          const isConfirmed = window.confirm(
            `Are you sure you want to delete this experiment?`,
          );
          if (!isConfirmed) return;

          this.analyticsService.trackButtonClick(ButtonClick.EXPERIMENT_DELETE);
          this.experimentManager.deleteExperiment();
        }}
      >
        Delete experiment
      </pr-button>
    `;
  }

  private renderMetadata() {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateMetadata({name});
    };

    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateMetadata({description});
    };

    const updatePublicName = (e: InputEvent) => {
      const publicName = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateMetadata({publicName});
    };

    return html`
      <div class="section">
        <div class="title">Metadata</div>
        <pr-textarea
          label="Private experiment name*"
          placeholder="Internal experiment name (not visible to participants)"
          class=${this.experimentEditor.experiment.metadata.name === ''
            ? 'required'
            : ''}
          variant="outlined"
          .value=${this.experimentEditor.experiment.metadata.name ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateName}
        >
        </pr-textarea>
        <pr-textarea
          label="Private experiment description"
          placeholder="Experiment description (not visible to participants)"
          variant="outlined"
          .value=${this.experimentEditor.experiment.metadata.description ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateDescription}
        >
        </pr-textarea>
        <pr-textarea
          label="Public experiment name"
          placeholder="External experiment name (shown to participants)"
          variant="outlined"
          .value=${this.experimentEditor.experiment.metadata.publicName ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updatePublicName}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderPermissions() {
    const isPublic =
      this.experimentEditor.experiment.permissions.visibility ===
      Visibility.PUBLIC;

    const updateVisibility = () => {
      const visibility = isPublic ? Visibility.PRIVATE : Visibility.PUBLIC;
      this.experimentEditor.updatePermissions({visibility});
    };

    return html`
      <div class="section">
        <div class="title">Permissions</div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isPublic}
            ?disabled=${!this.experimentEditor.isCreator}
            @click=${updateVisibility}
          >
          </md-checkbox>
          <div>
            Make experiment public (all researchers on platform can view and
            edit)
          </div>
        </div>
      </div>
    `;
  }

  private renderCohortParticipantConfig() {
    // TODO: Consolidate helper functions with the ones under
    // cohorts_settings_dialog.ts (as they're basically the same,
    // just updating experiment config vs. cohort config)
    return html`
      <div class="section">
        <div class="title">Default cohort settings</div>
        <div class="description">
          Note: Cohorts within your experiment will be automatically created
          with these settings. You can update each individual cohort's settings
          later.
        </div>
        ${this.renderMaxParticipantConfig()}
      </div>
    `;
  }

  private renderMinParticipantConfig() {
    const minParticipants =
      this.experimentEditor.experiment.defaultCohortConfig
        .minParticipantsPerCohort;

    const updateCheck = () => {
      if (minParticipants === null) {
        this.experimentEditor.updateCohortConfig({minParticipantsPerCohort: 0});
      } else {
        this.experimentEditor.updateCohortConfig({
          minParticipantsPerCohort: null,
        });
      }
    };

    const updateNum = (e: InputEvent) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentEditor.updateCohortConfig({minParticipantsPerCohort: num});
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${minParticipants !== null}
            ?disabled=${!this.experimentManager.isCreator}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>
            Require minimum number of participants in cohort to start experiment
          </div>
        </div>
        <div class="number-input">
          <label for="minParticipants"> Minimum number of participants </label>
          <input
            type="number"
            id="minParticipants"
            name="minParticipants"
            min="0"
            .value=${minParticipants ?? 0}
            ?disabled=${!this.experimentManager.isCreator}
            @input=${updateNum}
          />
        </div>
      </div>
    `;
  }

  private renderMaxParticipantConfig() {
    const maxParticipants =
      this.experimentEditor.experiment.defaultCohortConfig
        .maxParticipantsPerCohort;

    const updateCheck = () => {
      if (maxParticipants === null) {
        this.experimentEditor.updateCohortConfig({
          maxParticipantsPerCohort: 100,
        });
      } else {
        this.experimentEditor.updateCohortConfig({
          maxParticipantsPerCohort: null,
        });
      }
    };

    const updateNum = (e: InputEvent) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.experimentEditor.updateCohortConfig({maxParticipantsPerCohort: num});
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${maxParticipants !== null}
            ?disabled=${!this.experimentManager.isCreator}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>Limit cohort to maximum number of participants</div>
        </div>
        ${maxParticipants
          ? html`<div class="number-input">
              <label for="maxParticipants">
                Maximum number of participants
              </label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                min="0"
                .value=${maxParticipants ?? 100}
                ?disabled=${!this.experimentManager.isCreator}
                @input=${updateNum}
              />
            </div>`
          : ''}
      </div>
    `;
  }

  private renderProlificConfig() {
    const config = this.experimentEditor.experiment.prolificConfig;
    const isProlific = config.enableProlificIntegration;

    const updateProlificIntegration = () => {
      const enableProlificIntegration = !isProlific;
      this.experimentEditor.updateProlificConfig({enableProlificIntegration});
    };

    return html`
      <div class="section">
        <div class="title">Prolific Integration</div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isProlific}
            ?disabled=${!this.experimentManager.isCreator}
            @click=${updateProlificIntegration}
          >
          </md-checkbox>
          <div>Enable integration with Prolific</div>
        </div>
        ${isProlific ? this.renderProlificRedirectCodes() : nothing}
      </div>
    `;
  }

  private renderProlificRedirectCodes() {
    const updateDefault = (e: InputEvent) => {
      const defaultRedirectCode = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateProlificConfig({defaultRedirectCode});
    };

    const updateAttention = (e: InputEvent) => {
      const attentionFailRedirectCode = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateProlificConfig({attentionFailRedirectCode});
    };

    const updateBooted = (e: InputEvent) => {
      const bootedRedirectCode = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateProlificConfig({bootedRedirectCode});
    };

    return html`
      <div class="inner-setting">
        <pr-textarea
          label="Default redirect code (e.g., when experiment ends)"
          placeholder="Add Prolific redirect code"
          variant="outlined"
          .value=${this.experimentEditor.experiment.prolificConfig
            .defaultRedirectCode ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateDefault}
        >
        </pr-textarea>
        <pr-textarea
          label="Attention redirect code (used when participants fail attention checks)"
          placeholder="Add Prolific redirect code for attention check failures"
          variant="outlined"
          .value=${this.experimentEditor.experiment.prolificConfig
            .attentionFailRedirectCode ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateAttention}
        >
        </pr-textarea>
        <pr-textarea
          label="Booted redirect code (used when experimenters boot a participant from an experiment)"
          placeholder="Add Prolific redirect code for booted participants"
          variant="outlined"
          .value=${this.experimentEditor.experiment.prolificConfig
            .bootedRedirectCode ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateBooted}
        >
        </pr-textarea>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-settings-editor': ExperimentSettingsEditor;
  }
}
