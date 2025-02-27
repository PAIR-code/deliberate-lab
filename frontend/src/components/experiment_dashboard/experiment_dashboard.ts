import '../../pair-components/button';
import '../experiment_builder/experiment_builder';
import '../experiment_builder/experiment_settings_dialog';
import '../experimenter/experimenter_panel';
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
import {ParticipantService} from '../../services/participant.service';

import {CohortConfig, StageKind} from '@deliberation-lab/utils';
import {getCohortDescription, getCohortName} from '../../shared/cohort.utils';
import {
  getParticipantStatusDetailText,
  isObsoleteParticipant,
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
  private readonly participantService = core.getService(ParticipantService);

  override render() {
    if (this.experimentManager.isEditingFull) {
      return this.renderEditor();
    }

    if (this.experimentService.isLoading || this.experimentManager.isLoading) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <div class="main-panel">
        <page-header></page-header>
        <experimenter-panel></experimenter-panel>
      </div>
      ${this.renderPanels()} ${this.renderCohortSettingsDialog()}
      ${this.renderExperimentSettingsDialog()}
    `;
  }

  private renderPanels() {
    if (Object.keys(this.experimentService.stageConfigMap).length === 0) {
      return html`
        <div class="cohort-panel">
          <div class="warning">
            ⚠️ Your experiment has no stages. Use the edit button in the left
            panel to add stages in order to unlock cohort and participant
            creation.
          </div>
        </div>
      `;
    }
    return html`
      ${this.renderCohortListPanel()} ${this.renderParticipantStatsPanel()}
      ${this.renderParticipantPreviewPanel()}
    `;
  }

  private renderCohortListPanel() {
    if (!this.experimentManager.showCohortList) {
      return nothing;
    }
    return html`
      <div class="cohort-panel">
        <cohort-list></cohort-list>
      </div>
    `;
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
    return html`
      <div class="editor-wrapper">
        <page-header></page-header>
        <experiment-builder></experiment-builder>
      </div>
    `;
  }

  private renderParticipantStatsPanel() {
    if (!this.experimentManager.showParticipantStats) {
      return nothing;
    }

    if (!this.experimentManager.currentParticipantId) {
      return html`
        <div class="stats-panel">
          ${this.renderParticipantHeader()}
          <div class="empty-message">
            Use the left panel to manage and select participants.
          </div>
        </div>
      `;
    }

    return html`
      <div class="stats-panel">
        ${this.renderParticipantHeader()}
        <div>
          <participant-stats
            .profile=${this.experimentManager.currentParticipant}
          >
          </participant-stats>
        </div>
        <div class="content-wrapper">
          <code>
            ${JSON.stringify(this.experimentManager.currentParticipant)}
          </code>
        </div>
      </div>
    `;
  }

  private renderParticipantPreviewPanel() {
    if (!this.experimentManager.showParticipantPreview) {
      return nothing;
    }

    if (!this.experimentManager.currentParticipantId) {
      return html`
        <div class="preview-panel">
          ${this.renderParticipantHeader(true)}
          <div class="empty-message">
            Use the left panel to manage and select participants.
          </div>
        </div>
      `;
    }

    const popupStatus = this.getParticipantStatusText() !== '';
    return html`
      <div class="preview-panel">
        ${this.renderParticipantHeader(true)}
        <participant-view class="${popupStatus ? 'sepia' : ''}">
        </participant-view>
      </div>
    `;
  }

  private renderParticipantHeader(isPreview = false) {
    const getProfileString = () => {
      const currentParticipant = this.experimentManager.currentParticipant;
      if (!currentParticipant) {
        if (isPreview) {
          return 'Participant preview';
        } else {
          return 'Participant details';
        }
      }
      return `
        ${currentParticipant.avatar ?? ''}
        ${currentParticipant?.name ?? ''}
        (${currentParticipant?.publicId})
      `;
    };

    const renderAgentParticipantButton = () => {
      const currentParticipant = this.experimentManager.currentParticipant;
      const currentStageId = this.participantService.currentStageViewId;
      if (!currentParticipant || !currentStageId) return nothing;

      return html`
        <pr-tooltip
          text="Experimental feature: Test agent participant prompt"
          position="BOTTOM_END"
        >
          <pr-icon-button
            icon="robot_2"
            size="small"
            color="tertiary"
            variant="default"
            @click=${() => {
              this.experimentManager.testAgentParticipantPrompt(
                currentParticipant.privateId,
                currentStageId,
              );
            }}
          >
          </pr-icon-button>
        </pr-tooltip>
      `;
    };

    const renderStatusBanner = () => {
      if (!isPreview) return nothing;
      const text = this.getParticipantStatusText();
      if (text === '') return getProfileString();
      return html` <div class="participant-status-banner">${text}</div> `;
    };

    return html`
      <div class="header">
        <div class="left">
          <pr-tooltip text="Hide panel" position="RIGHT">
            <pr-icon-button
              icon="visibility_off"
              size="small"
              color="neutral"
              variant="default"
              @click=${() => {
                if (isPreview) {
                  this.experimentManager.setShowParticipantPreview(false);
                } else {
                  this.experimentManager.setShowParticipantStats(false);
                }
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          ${!isPreview ? getProfileString() : ''} ${renderStatusBanner()}
        </div>
        <div class="right">
          ${renderAgentParticipantButton()} ${this.renderTransferMenu()}
        </div>
      </div>
    `;
  }

  private getParticipantStatusText() {
    const profile = this.experimentManager.currentParticipant;
    const stageId = this.participantService.currentStageViewId ?? '';
    const stage = this.experimentService.getStage(stageId);
    if (!stage || !profile) return '';

    return getParticipantStatusDetailText(
      profile,
      this.cohortService.isStageInWaitingPhase(stage.id),
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
          ${this.experimentManager.availableCohorts.sort((a, b) => {return a.metadata.name.localeCompare(b.metadata.name);}).map((cohort) =>
            this.renderTransferOption(cohort),
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
        this.experimentManager.currentParticipant.currentStageId,
      );
      if (!stage || !(stage.kind === StageKind.TRANSFER)) {
        const isConfirmed = window.confirm(
          `Participant is not in a transfer stage. Are you sure you want to transfer them?`,
        );
        if (!isConfirmed) return;
      }

      this.analyticsService.trackButtonClick(ButtonClick.TRANSFER_INITIATE);
      this.experimentManager.initiateParticipantTransfer(
        this.experimentManager.currentParticipant.privateId,
        cohort.id,
      );
    };

    return html`
      <div class="menu-item" role="button" @click=${initiateTransfer}>
        <div>${getCohortName(cohort)}</div>
        <div class="subtitle">${getCohortDescription(cohort)}</div>
        <div class="subtitle">
          ${this.experimentManager.getCohortParticipants(
            cohort.id,
            cohort.participantConfig.includeAllParticipantsInCohortCount,
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
