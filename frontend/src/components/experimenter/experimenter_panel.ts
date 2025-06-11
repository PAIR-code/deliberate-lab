import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import './experimenter_data_editor';
import './experimenter_manual_chat';

import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ButtonClick, AnalyticsService} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {AgentEditor} from '../../services/agent.editor';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {
  AlertMessage,
  AlertStatus,
  ParticipantProfileExtended,
  StageKind,
  EXPERIMENT_VERSION_ID,
} from '@deliberation-lab/utils';

import {styles} from './experimenter_panel.scss';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

enum PanelView {
  DEFAULT = 'default',
  PARTICIPANT_SEARCH = 'participant_search',
  MANUAL_CHAT = 'manual_chat',
  API_KEY = 'api_key',
  ALERTS = 'alerts',
}

/** Experimenter panel component */
@customElement('experimenter-panel')
export class Panel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly agentEditor = core.getService(AgentEditor);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.DEFAULT;
  @state() isLoading = false;
  @state() isDownloading = false;
  @state() isAckAlertLoading = false;
  @state() participantSearchQuery = '';

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const isSelected = (panelView: PanelView) => {
      return this.panelView === panelView;
    };

    return html`
      <div class="panel-wrapper">
        <div class="sidebar">
          <pr-tooltip text="Dashboard settings" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="tune"
              size="medium"
              variant=${isSelected(PanelView.DEFAULT) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.DEFAULT;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Participant search" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="search"
              size="medium"
              variant=${isSelected(PanelView.PARTICIPANT_SEARCH)
                ? 'tonal'
                : 'default'}
              @click=${() => {
                this.panelView = PanelView.PARTICIPANT_SEARCH;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Send manual chat" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="forum"
              size="medium"
              variant=${isSelected(PanelView.MANUAL_CHAT) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.MANUAL_CHAT;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Edit API key" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="key"
              size="medium"
              variant=${isSelected(PanelView.API_KEY) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.API_KEY;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Alerts" position="RIGHT_END">
            <pr-icon-button
              color=${this.experimentManager.hasNewAlerts &&
              !isSelected(PanelView.ALERTS)
                ? 'error'
                : 'secondary'}
              icon=${this.experimentManager.hasNewAlerts &&
              !isSelected(PanelView.ALERTS)
                ? 'notifications_active'
                : 'notifications'}
              size="medium"
              variant=${isSelected(PanelView.ALERTS) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.ALERTS;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
        ${this.renderPanelView()}
      </div>
    `;
  }

  private renderOutdatedWarning() {
    if (!this.experimentService.experiment) return nothing;

    if (this.experimentService.experiment.versionId < EXPERIMENT_VERSION_ID) {
      return html`
        <div class="banner warning">
          <p>
            ⚠️ Warning: This experiment was created with a previous version of
            Deliberate Lab and may not be compatible with the current version
            (e.g., some stages or features may not load or function properly).
          </p>
          <p>
            Contact the deployment owners if you would like to upgrade this
            experiment to the latest version.
          </p>
        </div>
      `;
    }
    return nothing;
  }

  private renderPanelView() {
    switch (this.panelView) {
      case PanelView.PARTICIPANT_SEARCH:
        return this.renderParticipantSearchPanel();
      case PanelView.MANUAL_CHAT:
        return this.renderManualChatPanel();
      case PanelView.API_KEY:
        return this.renderApiKeyPanel();
      case PanelView.ALERTS:
        return this.renderAlertPanel();
      default:
        return this.renderDefaultPanel();
    }
  }

  private renderDefaultPanel() {
    const showCohortList = this.experimentManager.showCohortList;
    const showCohortEditor = this.experimentManager.showCohortEditor;
    const hideLockedCohorts = this.experimentManager.hideLockedCohorts;
    const expandAllCohorts = this.experimentManager.expandAllCohorts;

    return html`
      <div class="main">
        ${this.renderOutdatedWarning()}
        <div class="top">
          <div class="header">Cohort Panel</div>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setShowCohortList(!showCohortList);
            }}
          >
            <pr-icon-button
              color="tertiary"
              size="medium"
              variant="default"
              icon=${showCohortList ? 'visibility_off' : 'visibility'}
            >
            </pr-icon-button>
            <div>${showCohortList ? 'Hide' : 'Show'} cohort list</div>
          </div>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setHideLockedCohorts(!hideLockedCohorts);
            }}
          >
            <pr-icon-button
              color="tertiary"
              size="medium"
              variant="default"
              icon=${hideLockedCohorts ? 'filter_list' : 'filter_list_off'}
            >
            </pr-icon-button>
            <div>
              ${hideLockedCohorts ? 'Show all cohorts' : 'Hide locked cohorts'}
            </div>
          </div>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setExpandAllCohorts(!expandAllCohorts);
            }}
          >
            <pr-icon-button
              color="tertiary"
              size="medium"
              variant="default"
              icon=${expandAllCohorts ? 'collapse_all' : 'expand_all'}
            >
            </pr-icon-button>
            <div>${expandAllCohorts ? 'Collapse' : 'Expand'} all cohorts</div>
          </div>
          <div class="header">Cohort Editor</div>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setShowCohortEditor(!showCohortEditor);
            }}
          >
            <pr-icon-button
              color="tertiary"
              size="medium"
              variant="default"
              icon=${showCohortEditor ? 'visibility_off' : 'visibility'}
            >
            </pr-icon-button>
            <div>${showCohortEditor ? 'Hide' : 'Show'} cohort editor</div>
          </div>
          ${this.renderParticipantSettingsPanel()}
        </div>
        <div class="bottom">
          <div class="header">Actions</div>
          ${this.renderExperimentActions()}
          <div class="subtitle">
            Experiment Version: ${this.experimentService.experiment?.versionId}
            (latest version: ${EXPERIMENT_VERSION_ID})
          </div>
        </div>
      </div>
    `;
  }

  private renderParticipantSettingsPanel() {
    if (!this.experimentManager.currentParticipantId) {
      return;
    }
    const showCohortList = this.experimentManager.showCohortList;
    const showPreview = this.experimentManager.showParticipantPreview;
    const showStats = this.experimentManager.showParticipantStats;
    return html`<div class="header">Participant panels</div>
      <div
        class="checkbox-wrapper"
        @click=${() => {
          this.experimentManager.setShowParticipantStats(!showStats);
        }}
      >
        <pr-icon-button
          color="tertiary"
          size="medium"
          variant="default"
          icon=${showStats ? 'visibility_off' : 'visibility'}
        >
        </pr-icon-button>
        <div>${showStats ? 'Hide' : 'Show'} participant details</div>
      </div>
      <div
        class="checkbox-wrapper"
        @click=${() => {
          this.experimentManager.setShowParticipantPreview(!showPreview);
        }}
      >
        <pr-icon-button
          color="tertiary"
          size="medium"
          variant="default"
          icon=${showPreview ? 'visibility_off' : 'visibility'}
        >
        </pr-icon-button>
        <div>${showPreview ? 'Hide' : 'Show'} participant preview</div>
      </div>`;
  }
  private renderParticipantSearchPanel() {
    const handleInput = (e: Event) => {
      this.participantSearchQuery = (e.target as HTMLTextAreaElement).value;
    };

    const searchResults =
      this.participantSearchQuery === ''
        ? []
        : this.experimentManager.getParticipantSearchResults(
            this.participantSearchQuery,
          );

    const renderResult = (participant: ParticipantProfileExtended) => {
      const cohortName =
        this.experimentManager.getCurrentParticipantCohort(participant)
          ?.metadata.name ?? '';

      const onResultClick = () => {
        this.experimentManager.setCurrentParticipantId(participant.privateId);
      };

      const isCurrent =
        participant.privateId ===
        this.experimentManager.currentParticipant?.privateId;

      return html`
        <div
          class="search-result ${isCurrent ? 'current' : ''}"
          role="button"
          @click=${onResultClick}
        >
          <div class="title">${participant.publicId}</div>
          <div>${cohortName}</div>
        </div>
      `;
    };

    return html`
      <div class="main">
        <div class="top">
          <div class="header">Participant search</div>
          <pr-textarea
            variant="outlined"
            label="Search by any participant ID (public, private, Prolific) or name"
            @input=${handleInput}
          >
          </pr-textarea>
          <div class="header">Search results</div>
          <div class="search-results">
            ${searchResults.length === 0
              ? html`<div>No results</div>`
              : nothing}
            ${searchResults.map((participant) => renderResult(participant))}
          </div>
        </div>
      </div>
    `;
  }

  private renderManualChatPanel() {
    const stageId = this.participantService.currentStageViewId ?? '';
    const stage = this.experimentService.getStage(stageId);

    if (stage?.kind !== StageKind.CHAT) {
      return html`
        <div class="main">
          <div class="top">
            <div class="header">Manual chat</div>
            <div>Navigate to a chat stage preview to send a message.</div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="main">
        <div class="top">
          <div class="header">Manual chat</div>
          <experimenter-manual-chat></experimenter-manual-chat>
        </div>
      </div>
    `;
  }

  private renderAlertPanel() {
    const newAlerts = this.experimentManager.newAlerts;
    const oldAlerts = this.experimentManager.oldAlerts;

    const renderAlert = (alert: AlertMessage) => {
      const cohort = this.experimentManager.getCohort(alert.cohortId);
      const participant =
        this.experimentManager.participantMap[alert.participantId];

      const onAck = () => {
        // TODO: Add UI so the experimenter can send a custom response
        // (and add UI for the participant to view alert status/response)
        this.isAckAlertLoading = true;
        const response = 'Acknowledged';
        this.experimentManager.ackAlertMessage(alert.id, response);
        this.isAckAlertLoading = false;
      };

      return html`
        <div class="alert ${alert.status === AlertStatus.NEW ? 'new' : ''}">
          <div class="subtitle">
            ${convertUnifiedTimestampToDate(alert.timestamp)}
          </div>
          <div>
            ${cohort?.metadata.name ?? 'Unknown cohort'}
            (${participant?.name ?? 'Unknown participant'})
          </div>
          <div>${alert.message}</div>
          ${alert.status === AlertStatus.NEW
            ? html`
                <pr-icon-button
                  icon="check_circle"
                  variant="default"
                  ?loading=${this.isAckAlertLoading}
                  @click=${onAck}
                >
                </pr-icon-button>
              `
            : nothing}
        </div>
      `;
    };

    return html`
      <div class="main">
        <div class="top">
          <div class="header">New Alerts</div>
          ${newAlerts.map((alert) => renderAlert(alert))}
          <div class="header">Past Alerts</div>
          ${oldAlerts.map((alert) => renderAlert(alert))}
        </div>
      </div>
    `;
  }

  private renderApiKeyPanel() {
    return html`
      <div class="main">
        <div class="top">
          <div class="header">Experimenter settings</div>
          <experimenter-data-editor></experimenter-data-editor>
        </div>
      </div>
    `;
  }

  private renderExperimentDownloadButton() {
    const onClick = async () => {
      this.isDownloading = true;
      await this.experimentManager.downloadExperiment();
      this.isDownloading = false;
    };

    return html`
      <pr-button
        color="secondary"
        variant="outlined"
        ?loading=${this.isDownloading}
        @click=${onClick}
      >
        <pr-icon icon="download" color="secondary" variant="default"> </pr-icon>
        <div>Download experiment data</div>
      </pr-button>
    `;
  }

  private renderExperimentForkButton() {
    const onClick = () => {
      // Display confirmation dialog
      const isConfirmed = window.confirm(
        'This will create a copy of this experiment. Are you sure you want to proceed?',
      );
      if (!isConfirmed) return;
      this.analyticsService.trackButtonClick(ButtonClick.EXPERIMENT_FORK);
      this.experimentManager.forkExperiment();
    };

    return html`
      <pr-button color="secondary" variant="outlined" @click=${onClick}>
        <pr-icon icon="fork_right" color="secondary" variant="default">
        </pr-icon>
        <div>Fork experiment</div>
      </pr-button>
    `;
  }

  private renderExperimentEditButton() {
    const tooltip = `
      Experiment creators can edit metadata any time
      + can edit stages if users have not joined the experiment.`;

    const onClick = () => {
      this.analyticsService.trackButtonClick(
        this.experimentManager.isCreator
          ? ButtonClick.EXPERIMENT_EDIT
          : ButtonClick.EXPERIMENT_PREVIEW_CONFIG,
      );
      this.experimentManager.setIsEditing(true);
    };

    return html`
      <pr-tooltip text=${tooltip} position="TOP_START">
        <pr-button color="secondary" variant="outlined" @click=${onClick}>
          <pr-icon
            icon=${this.experimentManager.isCreator ? 'edit_note' : 'overview'}
            color="secondary"
            variant="default"
          >
          </pr-icon>
          <div>Edit experiment</div>
        </pr-button>
      </pr-tooltip>
    `;
  }

  private renderExperimentDeleteButton() {
    return html`
      <pr-button
        color="error"
        variant="outlined"
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
        <pr-icon icon="delete" color="error" variant="default"> </pr-icon>
        <div>Delete experiment</div>
      </pr-button>
    `;
  }

  private renderExperimentActions() {
    return html`
      ${this.renderExperimentDownloadButton()}
      ${this.renderExperimentForkButton()} ${this.renderExperimentEditButton()}
      ${this.renderExperimentDeleteButton()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-panel': Panel;
  }
}
