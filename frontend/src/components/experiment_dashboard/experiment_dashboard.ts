import '../../pair-components/button';
import '../experiment_builder/experiment_builder';
import '../experiment_builder/experiment_settings_dialog';
import '../header/header';
import '../participant_view/participant_view';
import './cohort_settings_dialog';
import './cohort_list';
import './participant_stats';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {CohortService} from '../../services/cohort.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';

import {CohortConfig, StageKind} from '@deliberation-lab/utils';
import {getCohortDescription, getCohortName} from '../../shared/cohort.utils';
import {
  getParticipantStatusDetailText,
  isObsoleteParticipant
} from '../../shared/participant.utils';

import {styles} from './experiment_dashboard.scss';

/** Experiment dashboard used to view/update cohorts, participants */
@customElement('experiment-dashboard')
export class Component extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly cohortService = core.getService(CohortService);
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
      <div class="left-panel">
        <page-header></page-header>
        ${this.renderCohortList()}
      </div>
      ${this.renderRightPanel()}
      ${this.renderCohortSettingsDialog()}
      ${this.renderExperimentSettingsDialog()}
    `;
  }

  private renderCohortList() {
    if (Object.keys(this.experimentService.stageConfigMap).length === 0) {
      return html`
        <div>
          ⚠️ WARNING: Your experiment has no stages. Use the edit button in the
          top right to add stages in order to unlock cohort and participant
          creation.
        </div>
      `;
    }
    return html`<cohort-list></cohort-list>`;
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

  private renderRightPanel() {
    if (!this.experimentManager.currentParticipantId) {
      return html`
        <div class="experiment-manager">
          <div class="empty-message">
            Use the left panel to manage and select participants.
          </div>
        </div>
      `;
    }

    const renderContent = () => {
      const popupStatus = this.getParticipantStatusText() !== '';
      if (this.experimentManager.showParticipantPreview) {
        return html`
          <participant-view class="${popupStatus ? 'sepia' : ''}">
          </participant-view>
        `;
      } else {
        return html`
          <div class="content-wrapper">
            <participant-stats .profile=${this.experimentManager.currentParticipant}>
            </participant-stats>
            <code>
              ${JSON.stringify(this.experimentManager.currentParticipant)}
            </code>
          </div>
        `;
      }
    };

    return html`
      <div class="experiment-manager">
        ${this.renderHeader()} ${renderContent()}
      </div>
    `;
  }

  private renderHeader() {
    const show = this.experimentManager.showParticipantPreview;

    const renderSummaryButton = () => {
      return html`
        <pr-button
          color="tertiary"
          variant=${!show ? 'tonal' : 'default'}
          @click=${() => { this.experimentManager.setShowParticipantPreview(false) }}>
          Stats
        </pr-button>
      `;
    };

    const renderPreviewButton = () => {
      return html`
        <pr-button
          color="tertiary"
          variant=${show ? 'tonal' : 'default'}
          @click=${() => { this.experimentManager.setShowParticipantPreview(true) }}>
          Preview
        </pr-button>
      `;
    };

    const renderStatusBanner = () => {
      const text = this.getParticipantStatusText();
      if (text === '') return nothing;
      return html`
        <div class="participant-status-banner">${text}</div>
      `;
    }

    return html`
      <div class="header">
        <div class="left">
          ${this.experimentManager.currentParticipant?.avatar ?? ''}
          ${this.experimentManager.currentParticipant?.name ?? ''}
          ${this.experimentManager.currentParticipant?.publicId
            ? `(${this.experimentManager.currentParticipant?.publicId})`
            : ''}
          ${renderSummaryButton()}
          ${renderPreviewButton()}
          ${renderStatusBanner()}
        </div>
        ${this.renderTransferMenu()}
      </div>
    `;
  }

  private getParticipantStatusText() {
    const profile = this.experimentManager.currentParticipant;
    const stageId = profile?.currentStageId ?? '';
    const stage = this.experimentService.getStage(stageId);
    if (!stage || !profile) return '';

    return getParticipantStatusDetailText(
      profile,
      this.cohortService.isStageInWaitingPhase(stage.id)
    );
  }

  private renderTransferMenu() {
    const participant = this.experimentManager.currentParticipant;

    if (!participant || isObsoleteParticipant(participant)) {
      return nothing;
    }

    return html`
      <pr-menu name="Transfer">
        <div class="menu-wrapper">
          ${this.experimentManager.availableCohorts.map(
            (cohort) => this.renderTransferOption(cohort)
          )}
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
    // Don't allow transferring to locked cohors
    if (
      this.experimentService.experiment &&
      this.experimentService.experiment.cohortLockMap[cohort.id]
    ) {
      return;
    }

    const initiateTransfer = () => {
      if (!this.experimentManager.currentParticipant) {
        return;
      }

      const stage = this.experimentService.getStage(
        this.experimentManager.currentParticipant.currentStageId
      );
      if (!stage || !(stage.kind === StageKind.TRANSFER)) {
        const isConfirmed = window.confirm(
          `Participant is not in a transfer stage. Are you sure you want to transfer them?`
        );
        if (!isConfirmed) return;
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
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-dashboard': Component;
  }
}
