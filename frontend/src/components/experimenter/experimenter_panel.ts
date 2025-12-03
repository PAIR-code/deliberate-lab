import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import '../participant_profile/profile_display';
import './experimenter_data_editor';
import './experimenter_manual_chat';
import './log_dashboard';

import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {reaction} from 'mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ButtonClick, AnalyticsService} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
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
  LOGS = 'logs',
}

/** Experimenter panel component */
@customElement('experimenter-panel')
export class Panel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.DEFAULT;
  @state() isLoading = false;
  @state() isAckAlertLoading = false;
  @state() participantSearchQuery = '';
  @state() showToast = false;

  private titleInterval: number | undefined = undefined;
  private originalTitle = document.title;
  private disposeReaction: (() => void) | undefined;

  override connectedCallback() {
    super.connectedCallback();
    this.originalTitle = document.title;

    this.disposeReaction = reaction(
      () => this.experimentManager.newAlerts.length,
      (newCount, previousCount: number | undefined) => {
        if (
          newCount > 0 &&
          (previousCount === undefined || newCount > previousCount)
        ) {
          this.startTitleFlash();
          this.showToast = true;
        } else if (newCount === 0) {
          this.stopTitleFlash();
          this.showToast = false;
        }
      },
      {fireImmediately: true},
    );
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTitleFlash();
    if (this.disposeReaction) {
      this.disposeReaction();
    }
  }

  get hasNewAlerts() {
    return this.experimentManager.hasNewAlerts;
  }

  private startTitleFlash() {
    if (this.titleInterval) return;
    let isOriginal = true;
    this.titleInterval = window.setInterval(() => {
      document.title = isOriginal ? '⚠️ New Alert!' : this.originalTitle;
      isOriginal = !isOriginal;
    }, 1000);
  }

  private stopTitleFlash() {
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = undefined;
      document.title = this.originalTitle;
    }
  }

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
          <pr-tooltip text="View cohorts" position="RIGHT_END">
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
              class=${this.hasNewAlerts && !isSelected(PanelView.ALERTS)
                ? 'wiggle'
                : ''}
              color=${this.hasNewAlerts && !isSelected(PanelView.ALERTS)
                ? 'error'
                : 'secondary'}
              icon=${this.hasNewAlerts && !isSelected(PanelView.ALERTS)
                ? 'notifications_active'
                : 'notifications'}
              size="medium"
              variant=${isSelected(PanelView.ALERTS) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.ALERTS;
                this.showToast = false;
                this.stopTitleFlash();
              }}
            >
            </pr-icon-button>
          </pr-tooltip>

          <pr-tooltip text="View LLM logs" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="browse_activity"
              size="medium"
              variant=${isSelected(PanelView.LOGS) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.LOGS;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
        ${this.renderPanelView()} ${this.renderToast()}
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
      case PanelView.LOGS:
        return this.renderLogsPanel();
      default:
        return this.renderDefaultPanel();
    }
  }

  private renderDefaultPanel() {
    return html`
      <div class="main">
        ${this.renderOutdatedWarning()} ${this.renderCohortListPanel()}
        ${this.renderCohortEditorPanel()}
        <div class="bottom">
          <alpha-toggle></alpha-toggle>
          <div class="subtitle">
            Experiment Version: ${this.experimentService.experiment?.versionId}
            (latest version: ${EXPERIMENT_VERSION_ID})
          </div>
        </div>
      </div>
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

  private renderCohortEditorPanel() {
    if (!this.experimentManager.showCohortEditor) {
      return nothing;
    }
    return html`
      <div class="cohort-panel">
        <cohort-editor
          .cohort=${this.experimentManager.getCohort(
            this.experimentManager.currentCohortId ?? '',
          )}
        >
        </cohort-editor>
      </div>
    `;
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
    let alertResponse = '';

    const renderAlert = (alert: AlertMessage) => {
      const cohort = this.experimentManager.getCohort(alert.cohortId);
      const participant =
        this.experimentManager.participantMap[alert.participantId];

      const onAck = (response: string) => {
        this.isAckAlertLoading = true;
        this.experimentManager.ackAlertMessage(
          alert.id,
          alert.participantId,
          response,
        );
        this.isAckAlertLoading = false;
      };

      return html`
        <div class="alert ${alert.status === AlertStatus.NEW ? 'new' : ''}">
          <div
            class="alert-top clickable"
            @click=${() => {
              this.experimentManager.setCurrentParticipantId(
                participant.privateId,
              );
              this.experimentManager.setShowParticipantPreview(true, true);
            }}
          >
            <div class="alert-header">
              <div class="left">
                <participant-profile-display .profile=${participant}>
                </participant-profile-display>
                <div class="subtitle">
                  (${cohort?.metadata.name ?? 'Unknown cohort'})
                </div>
              </div>
              <div class="subtitle">
                ${convertUnifiedTimestampToDate(alert.timestamp)}
              </div>
            </div>
            <div class="alert-content">${alert.message}</div>
          </div>
          <div class="alert-bottom">
            <div class="subtitle">Your responses</div>
            ${alert.responses.map(
              (response) => html` <div class="response">${response}</div> `,
            )}
            <div class="alert-response-options">
              <div class="alert-response-input">
                <pr-textarea
                  .value=${alertResponse}
                  placeholder="Send a response"
                  @input=${(e: Event) => {
                    alertResponse = (e.target as HTMLTextAreaElement).value;
                  }}
                >
                </pr-textarea>
                <pr-icon-button
                  icon="send"
                  variant="default"
                  @click=${async () => {
                    onAck(alertResponse);
                  }}
                >
                </pr-icon-button>
              </div>
              ${alert.status === AlertStatus.NEW
                ? html`
                    <pr-tooltip text="Mark as read" position="TOP_END">
                      <pr-icon-button
                        icon="check_circle"
                        variant="default"
                        ?loading=${this.isAckAlertLoading}
                        @click=${() => {
                          onAck('');
                        }}
                      >
                      </pr-icon-button>
                    </pr-tooltip>
                  `
                : nothing}
            </div>
          </div>
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
          <div class="header">LLM Integration Settingss</div>
          <experimenter-data-editor></experimenter-data-editor>
        </div>
      </div>
    `;
  }

  private renderLogsPanel() {
    return html`
      <div class="main">
        <log-dashboard></log-dashboard>
      </div>
    `;
  }

  private renderToast() {
    if (!this.showToast || !this.hasNewAlerts) return nothing;

    return html`
      <div class="alert-toast">
        <div class="content">
          <pr-icon icon="warning" color="error"></pr-icon>
          <div>You have new alerts!</div>
        </div>
        <pr-icon-button
          icon="close"
          color="error"
          variant="default"
          @click=${() => {
            this.showToast = false;
            this.stopTitleFlash();
          }}
        >
        </pr-icon-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-panel': Panel;
  }
}
