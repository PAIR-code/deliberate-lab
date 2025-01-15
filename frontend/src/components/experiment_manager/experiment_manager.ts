import '../experiment_builder/experiment_builder';
import '../experiment_builder/experiment_settings_dialog';

import './cohort_settings_dialog';
import './experiment_manager_nav';
import './participant_stats';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {CohortConfig, StageKind} from '@deliberation-lab/utils';
import {getCohortDescription, getCohortName} from '../../shared/cohort.utils';
import {isObsoleteParticipant} from '../../shared/participant.utils';

import {styles} from './experiment_manager.scss';

/** Experiment manager used to view/update cohorts, participants */
@customElement('experiment-manager')
export class ExperimentManagerComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);

  override render() {
    if (this.experimentManager.isEditingFull) {
      return this.renderEditor();
    }

    if (this.experimentService.isLoading || this.experimentManager.isLoading) {
      return html`<div>Loading...</div>`;
    }

    return html`
      ${this.renderNav()}
      <div class="experiment-manager">${this.renderManager()}</div>
      ${this.renderCohortSettingsDialog()}
      ${this.renderExperimentSettingsDialog()}
    `;
  }

  private renderNav() {
    if (Object.keys(this.experimentService.stageConfigMap).length === 0) {
      return html`
        <div class="empty-nav">
          ⚠️ WARNING: Your experiment has no stages. Use the edit button in the
          top right to add stages in order to unlock cohort and participant
          creation.
        </div>
      `;
    }
    return html`<experiment-manager-nav></experiment-manager-nav>`;
  }

  private renderExperimentSettingsDialog() {
    if (!this.experimentManager.isEditingSettingsDialog) {
      return nothing;
    }

    return html` <experiment-settings-dialog></experiment-settings-dialog> `;
  }

  private renderCohortSettingsDialog() {
    if (!this.experimentManager.cohortEditing) {
      return nothing;
    }

    return html` <cohort-settings-dialog></cohort-settings-dialog> `;
  }

  private renderEditor() {
    return html` <experiment-builder></experiment-builder> `;
  }

  private renderManager() {
    if (!this.experimentManager.currentParticipantId) {
      return html`
        <div class="empty-message">
          Use the left panel to manage and select participants.
        </div>
      `;
    }

    return html`
      <div class="header">${this.renderHeader()}</div>
      <div class="content">${this.renderContent()}</div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="left">
        ${this.experimentManager.currentParticipant?.name ?? ''}
        ${this.experimentManager.currentParticipant?.publicId
          ? `(${this.experimentManager.currentParticipant?.publicId})`
          : ''}
      </div>
      ${this.renderTransferMenu()}
    `;
  }

  private renderTransferMenu() {
    const participant = this.experimentManager.currentParticipant;

    if (!participant || isObsoleteParticipant(participant)) {
      return nothing;
    }

    return html`
      <pr-menu name="Transfer">
        <div class="menu-wrapper">
          ${this.experimentManager.availableCohorts
            .filter(
              (cohort) =>
                !this.experimentService.experiment!.cohortLockMap[cohort.id]
            )
            .map((cohort) => this.renderTransferOption(cohort))}
        </div>
      </pr-menu>
    `;
  }

  private renderTransferOption(cohort: CohortConfig) {
    const currentCohortId =
      this.experimentManager.currentParticipant?.currentCohortId;
    // Don't allow transferring to the current cohort.
    if (cohort.id == currentCohortId) {
      return;
    }

    const initiateTransfer = () => {
      if (!this.experimentManager.currentParticipant) {
        return;
      }

      this.analyticsService.trackButtonClick(ButtonClick.TRANSFER_INITIATE);
      this.experimentManager.initiateParticipantTransfer(
        this.experimentManager.currentParticipant.privateId,
        cohort.id
      );
    };

    return html`
      <div class="menu-item" role="button" @click=${initiateTransfer}>
        <div>${getCohortName(cohort)}</div>
        <div class="subtitle">${getCohortDescription(cohort)}</div>
        <div class="subtitle">
          ${this.experimentManager.getCohortParticipants(
            cohort.id,
            cohort.participantConfig.includeAllParticipantsInCohortCount
          ).length}
          participants
        </div>
      </div>
    `;
  }

  private renderContent() {
    return html`
      <participant-stats .profile=${this.experimentManager.currentParticipant}>
      </participant-stats>
      <code>
        ${JSON.stringify(this.experimentManager.currentParticipant)}
      </code>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-manager': ExperimentManagerComponent;
  }
}
