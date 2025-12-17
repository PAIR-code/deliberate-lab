import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentManager} from '../../services/experiment.manager';

import {CohortConfig, CohortParticipantConfig} from '@deliberation-lab/utils';

import {styles} from './cohort_settings_dialog.scss';

/** Cohort settings dialog */
@customElement('cohort-settings-dialog')
export class CohortSettingsDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    if (!this.experimentManager.cohortEditing) {
      return nothing;
    }

    return html`
      <div class="dialog">
        <div class="header">
          <div>Edit cohort</div>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${() => {
              this.experimentManager.setCohortEditing(undefined);
            }}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          ${this.renderName()} ${this.renderDescription()}
          ${this.renderMaxParticipantConfig()}
        </div>
        <div class="footer">
          <pr-button
            color="error"
            variant="tonal"
            @click=${async () => {
              this.analyticsService.trackButtonClick(ButtonClick.COHORT_DELETE);
              await this.experimentManager.deleteCohort(
                this.experimentManager.cohortEditing!.id,
              );
              this.experimentManager.setCurrentCohortId(undefined);
              this.experimentManager.setShowCohortList(true, true);
            }}
          >
            Delete cohort
          </pr-button>
          <pr-button
            ?disabled=${!this.experimentManager.isCreator}
            @click=${() => {
              this.analyticsService.trackButtonClick(
                ButtonClick.COHORT_SAVE_EXISTING,
              );
              const cohort = this.experimentManager.cohortEditing;
              if (!cohort) return;
              this.experimentManager.updateCohortMetadata(
                cohort.id,
                cohort.metadata,
                cohort.participantConfig,
              );
              this.experimentManager.setCohortEditing(undefined);
            }}
          >
            Save
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderName() {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      const cohort = this.experimentManager.cohortEditing;

      if (!cohort) {
        return;
      }

      this.experimentManager.setCohortEditing({
        ...cohort,
        metadata: {...cohort.metadata, name},
      });
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Cohort name"
        variant="outlined"
        .value=${this.experimentManager.cohortEditing?.metadata.name ?? ''}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }

  private renderDescription() {
    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      const cohort = this.experimentManager.cohortEditing;

      if (!cohort) {
        return;
      }

      this.experimentManager.setCohortEditing({
        ...cohort,
        metadata: {...cohort.metadata, description},
      });
    };

    return html`
      <pr-textarea
        label="Description"
        placeholder="Cohort description"
        variant="outlined"
        .value=${this.experimentManager.cohortEditing?.metadata.description ??
        ''}
        @input=${updateDescription}
      >
      </pr-textarea>
    `;
  }

  updateConfig(config: Partial<CohortParticipantConfig> = {}) {
    const cohort = this.experimentManager.cohortEditing;
    if (!cohort) {
      return;
    }
    this.experimentManager.setCohortEditing({
      ...cohort,
      participantConfig: {...cohort.participantConfig, ...config},
    });
  }

  private renderMinParticipantConfig() {
    const cohort = this.experimentManager.cohortEditing;
    if (!cohort) return;

    const minParticipants = cohort.participantConfig.minParticipantsPerCohort;

    const updateCheck = () => {
      if (minParticipants === null) {
        this.updateConfig({minParticipantsPerCohort: 0});
      } else {
        this.updateConfig({minParticipantsPerCohort: null});
      }
    };

    const updateNum = (e: InputEvent) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.updateConfig({minParticipantsPerCohort: num});
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${minParticipants !== null}
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
            @input=${updateNum}
          />
        </div>
      </div>
    `;
  }

  private renderMaxParticipantConfig() {
    const cohort = this.experimentManager.cohortEditing;
    if (!cohort) return;

    const maxParticipants = cohort.participantConfig.maxParticipantsPerCohort;

    const updateCheck = () => {
      if (maxParticipants === null) {
        this.updateConfig({maxParticipantsPerCohort: 100});
      } else {
        this.updateConfig({maxParticipantsPerCohort: null});
      }
    };

    const updateNum = (e: InputEvent) => {
      const num = Number((e.target as HTMLTextAreaElement).value);
      this.updateConfig({maxParticipantsPerCohort: num});
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${maxParticipants !== null}
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
                @input=${updateNum}
              />
            </div>`
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-settings-dialog': CohortSettingsDialog;
  }
}
