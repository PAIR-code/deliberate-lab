import '../../pair-components/button';
import '../experiment_builder/experiment_builder';
import '../experiment_builder/experiment_settings_dialog';
import '../experimenter/experimenter_panel';
import '../header/header';
import '../participant_view/participant_view';
import './cohort_editor';
import './cohort_settings_dialog';
import './cohort_list';
import './participant_stats';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
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
  private readonly authService = core.getService(AuthService);
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
      ${this.renderParticipantStatsPanel()}
      ${this.renderParticipantPreviewPanel()}
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
          <pre><code>${JSON.stringify(
            this.experimentManager.currentParticipant,
            null,
            2,
          )}</code></pre>
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
    if (!this.experimentManager.currentParticipant) {
      return nothing;
    }

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

    const renderStatusBanner = () => {
      if (!isPreview) return nothing;
      const text = this.getParticipantStatusText();
      if (text === '') return getProfileString();
      return html` <div class="participant-status-banner">${text}</div> `;
    };

    const renderToggle = () => {
      return html`
        <pr-button
          color="secondary"
          variant="default"
          size="small"
          @click=${() => {
            this.experimentManager.setShowParticipantStats(isPreview, true);
          }}
        >
          Show ${isPreview ? 'stats' : 'preview'}
        </pr-button>
      `;
    };

    return html`
      <div class="header">
        <div class="left">
          ${!isPreview ? getProfileString() : ''} ${renderStatusBanner()}
          ${renderToggle()}
        </div>
        <div class="right">
          ${this.renderDebugModeButton()} ${this.renderTransferMenu()}
        </div>
      </div>
    `;
  }

  private renderDebugModeButton() {
    if (!this.authService.isExperimenter) return nothing;

    const debugMode = this.authService.isDebugMode;
    const tooltipText = `
      Turn debug mode ${debugMode ? 'off' : 'on'}.
      (When on, experimenters can debugging statements in participant preview.
      Note that only some stages have debugging statements.)
    `;

    return html`
      <pr-tooltip text=${tooltipText} position="BOTTOM_END">
        <pr-icon-button
          icon=${debugMode ? 'code_off' : 'code'}
          color="neutral"
          variant="default"
          @click=${() => {
            this.authService.setDebugMode(!debugMode);
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
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
          ${this.experimentManager.availableCohorts
            .sort((a, b) => {
              return a.metadata.name.localeCompare(b.metadata.name);
            })
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
    // Don't allow transferring to locked cohorts.
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

      const participant = this.experimentManager.currentParticipant;
      const cohortParticipants = this.experimentManager.getCohortParticipants(
        cohort.id,
      );

      // Check if there is already a participant with the same name in the cohort.
      if (participant.name) {
        const normalize = (name: string) => name.replace(/\s*\d+$/, '');
        const normalizedName = normalize(participant.name);
        const duplicateParticipant = cohortParticipants.find(
          (p) => p.name && normalize(p.name) === normalizedName,
        );

        if (duplicateParticipant) {
          const isConfirmed = window.confirm(
            `Warning: A participant with a similar name ("${duplicateParticipant.name}") already exists in cohort ${cohort.metadata.name}. Do you still want to transfer?`,
          );
          if (!isConfirmed) return;
        }
      }

      const stage = this.experimentService.getStage(participant.currentStageId);
      if (!stage || !(stage.kind === StageKind.TRANSFER)) {
        const isConfirmed = window.confirm(
          `Participant is not in a transfer stage. Are you sure you want to transfer them?`,
        );
        if (!isConfirmed) return;
      }

      this.analyticsService.trackButtonClick(ButtonClick.TRANSFER_INITIATE);
      this.experimentManager.initiateParticipantTransfer(
        participant.privateId,
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
