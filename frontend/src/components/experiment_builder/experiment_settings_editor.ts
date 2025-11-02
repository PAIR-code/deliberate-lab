import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/textfield/filled-text-field.js';
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

/** Editor for adjusting experiment metadata */
@customElement('experiment-metadata-editor')
export class ExperimentMetadataEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
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
      <div class="inner-wrapper">
        <div class="title">Experiment metadata</div>
        <md-filled-text-field
          label="Private experiment name (not visible to participants)"
          required
          .error=${!this.experimentEditor.experiment.metadata.name}
          .value=${this.experimentEditor.experiment.metadata.name ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateName}
        >
        </md-filled-text-field>
        <md-filled-text-field
          type="textarea"
          rows="2"
          label="Private experiment description (not visible to participants)"
          .value=${this.experimentEditor.experiment.metadata.description ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updateDescription}
        >
        </md-filled-text-field>
        <md-filled-text-field
          label="Public experiment name (shown to participants)"
          .value=${this.experimentEditor.experiment.metadata.publicName ?? ''}
          ?disabled=${!this.experimentManager.isCreator}
          @input=${updatePublicName}
        >
        </md-filled-text-field>
      </div>
    `;
  }
}

/** Editor for adjusting experiment permissions */
@customElement('experiment-permissions-editor')
export class ExperimentPermissionsEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    const isPublic =
      this.experimentEditor.experiment.permissions.visibility ===
      Visibility.PUBLIC;

    const updateVisibility = () => {
      const visibility = isPublic ? Visibility.PRIVATE : Visibility.PUBLIC;
      this.experimentEditor.updatePermissions({visibility});
    };

    return html`
      <div class="inner-wrapper">
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
            manage the experiment dashboard if you share the link with them)
          </div>
        </div>
      </div>
    `;
  }
}

/** Editor for adjusting experiment cohort default settings */
@customElement('experiment-cohort-editor')
export class ExperimentCohortEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    // TODO: Consolidate helper functions with the ones under
    // cohorts_settings_dialog.ts (as they're basically the same,
    // just updating experiment config vs. cohort config)
    return html`
      <div class="inner-wrapper">
        <div class="title">Default cohort settings</div>
        <div class="description">
          Note: Cohorts within your experiment will be automatically created
          with these settings. You can update each individual cohort's settings
          later.
        </div>
        ${this.renderMaxParticipantConfig()} ${this.renderBotProtectionConfig()}
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
        <md-filled-text-field
          label="Minimum number of participants"
          type="number"
          id="minParticipants"
          name="minParticipants"
          min="0"
          .value=${minParticipants ?? 0}
          ?disabled=${!this.experimentManager.isCreator || !minParticipants}
          @input=${updateNum}
        >
        </md-filled-text-field>
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
          <div>
            Set a default maximum number of participants per cohort (can be
            changed later)
          </div>
        </div>
        ${maxParticipants === null
          ? nothing
          : html` <div class="conditional-section">
              <md-filled-text-field
                label="Maximum number of participants"
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                min="0"
                .value=${maxParticipants ?? ''}
                ?disabled=${!this.experimentManager.isCreator ||
                !maxParticipants}
                @input=${updateNum}
              >
              </md-filled-text-field>
            </div>`}
      </div>
    `;
  }

  private renderBotProtectionConfig() {
    const botProtection =
      this.experimentEditor.experiment.defaultCohortConfig.botProtection ??
      false;

    const updateBotProtection = () => {
      this.experimentEditor.updateCohortConfig({
        botProtection: !botProtection,
      });
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${botProtection}
            ?disabled=${!this.experimentManager.isCreator}
            @click=${updateBotProtection}
          >
          </md-checkbox>
          <div>
            Enable bot protection (disables pasting in chat input to prevent
            automated responses)
          </div>
        </div>
      </div>
    `;
  }
}

/** Editor for adjusting Prolific integration settings */
@customElement('experiment-prolific-editor')
export class ExperimentProlificEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    const config = this.experimentEditor.experiment.prolificConfig;
    const isProlific = config.enableProlificIntegration;

    const updateProlificIntegration = () => {
      const enableProlificIntegration = !isProlific;
      this.experimentEditor.updateProlificConfig({enableProlificIntegration});
    };

    return html`
      <div class="inner-wrapper">
        <div class="title">Prolific settings</div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isProlific}
            ?disabled=${!this.experimentManager.isCreator}
            @click=${updateProlificIntegration}
          >
          </md-checkbox>
          <div>
            Enable participant recruitment integration with
            <a
              href="https://www.prolific.co/"
              target="_blank"
              rel="noreferrer noopener"
              >Prolific</a
            >
          </div>
        </div>
        ${this.renderProlificRedirectCodes(isProlific)}
      </div>
    `;
  }

  private renderProlificRedirectCodes(isEnabled: boolean) {
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
    if (!isEnabled) {
      return nothing;
    }

    return html`
      <div class="conditional-section">
        <md-filled-text-field
          required
          label="Default redirect code (e.g., when experiment ends)"
          .value=${this.experimentEditor.experiment.prolificConfig
            .defaultRedirectCode ?? ''}
          .error=${!this.experimentEditor.experiment.prolificConfig
            .defaultRedirectCode}
          ?disabled=${!this.experimentManager.isCreator || !isEnabled}
          @input=${updateDefault}
        >
        </md-filled-text-field>
        <md-filled-text-field
          label="Attention redirect code (used when participants fail attention checks)"
          .value=${this.experimentEditor.experiment.prolificConfig
            .attentionFailRedirectCode ?? ''}
          ?disabled=${!this.experimentManager.isCreator || !isEnabled}
          @input=${updateAttention}
        >
        </md-filled-text-field>
        <md-filled-text-field
          label="Booted redirect code (used when experimenters boot a participant from an experiment)"
          .value=${this.experimentEditor.experiment.prolificConfig
            .bootedRedirectCode ?? ''}
          ?disabled=${!this.experimentManager.isCreator || !isEnabled}
          @input=${updateBooted}
        >
        </md-filled-text-field>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-metadata-editor': ExperimentMetadataEditor;
    'experiment-cohort-editor': ExperimentCohortEditor;
    'experiment-permissions-editor': ExperimentPermissionsEditor;
    'experiment-prolific-editor': ExperimentProlificEditor;
  }
}
