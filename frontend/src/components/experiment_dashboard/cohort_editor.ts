import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import '../participant_profile/profile_display';
import './cohort_summary';
import './participant_summary';
import './agent_participant_configuration_dialog';
import './agent_mediator_add_dialog';
import {renderMediatorStatusChip} from './mediator_status';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  CohortConfig,
  MediatorProfileExtended,
  MediatorStatus,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './cohort_editor.scss';

/** Editor for current cohort (in experiment dashboard) */
@customElement('cohort-editor')
export class Component extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);

  @property() cohort: CohortConfig | undefined = undefined;
  @property() showAgentParticipantDialog = false;
  @property() showAgentMediatorDialog = false;

  @state() isStatusLoading = false;

  override render() {
    return html`
      <div class="experiment-manager">
        ${this.renderHeader()} ${this.renderContent()}
      </div>
    `;
  }

  private renderHeader() {
    const updateCohort = (e: Event) => {
      const id = (e.target as HTMLSelectElement).value;
      this.experimentManager.setCurrentCohortId(id);
    };

    const numCohorts = this.experimentManager.cohortList.length;

    const renderSelection = () => {
      if (numCohorts === 0) return html`Cohort editor`;
      const getNameDisplay = (cohort: CohortConfig) => {
        if (cohort.metadata.name) {
          return `${cohort.metadata.name} (${cohort.id.slice(0, 8)})`;
        }
        return `Cohort ${cohort.id.slice(0, 8)}`;
      };
      return html`
        <div>Edit cohort:</div>
        <select .value=${this.cohort?.id} @change=${updateCohort}>
          ${Object.values(this.experimentManager.cohortMap).map(
            (cohort) =>
              html`<option
                value=${cohort.id}
                ?selected=${cohort.id ===
                this.experimentManager.currentCohortId}
              >
                ${getNameDisplay(cohort)}
              </option>`,
          )}
        </select>
      `;
    };

    const renderAdd = () => {
      if (numCohorts === 0) return nothing;
      return html`
        <pr-tooltip text="Add new cohort" position="LEFT">
          <pr-icon-button
            color="secondary"
            variant="tonal"
            icon="add"
            @click=${this.addCohort}
          >
          </pr-icon-button>
        </pr-tooltip>
      `;
    };

    return html`
      <div class="content-banner">
        <div
          class="back-button"
          @click=${() => {
            this.experimentManager.setShowCohortList(true, true);
          }}
        >
          <pr-icon
            icon="chevron_backward"
            size="small"
            variant="default"
            color="secondary"
          >
          </pr-icon>
          <div>View all cohorts</div>
        </div>
      </div>
      <div class="header">
        <div class="left">${renderSelection()}</div>
        <div class="right">${renderAdd()}</div>
      </div>
    `;
  }

  private async addCohort() {
    const cohortName = this.experimentManager.getNextCohortName();
    const response = await this.experimentManager.createCohort({}, cohortName);
  }

  private renderContent() {
    const numCohorts = this.experimentManager.cohortList.length;

    if (!this.cohort) {
      return html`
        <div class="empty-message">
          ${numCohorts > 0
            ? html`<div>Use the dropdown above to select a cohort.</div>`
            : html`
                <div>
                  Create a cohort to add participants to your experiment. Once
                  you add a cohort, you will no longer be able to edit
                  experiment stages.
                </div>
                <pr-button variant="tonal" @click=${this.addCohort}>
                  Create new cohort
                </pr-button>
              `}
        </div>
      `;
    }

    return html`
      <div class="content">
        <div class="content-header">
          <div>
            <div>
              ${this.cohort?.metadata.name.length === 0
                ? 'Untitled cohort'
                : this.cohort?.metadata.name}
            </div>
            <div class="subtitle">${this.cohort?.id}</div>
          </div>
          <div class="toolbar">
            ${this.renderLockButton()} ${this.renderCopyButton()}
            ${this.renderSettingsButton()}
          </div>
        </div>
        ${this.renderParticipantTable(
          'Human participants',
          this.experimentManager.getCohortHumanParticipants(this.cohort.id),
          html`${this.renderAddHumanParticipant()}`,
        )}
        ${this.renderParticipantTable(
          'Agent participants',
          this.experimentManager.getCohortAgentParticipants(this.cohort.id),
          html`${this.renderAddAgentParticipant()}`,
        )}
        ${this.renderMediatorTable(
          'Agent mediators',
          this.experimentManager.getCohortAgentMediators(this.cohort.id),
          html`${this.renderAddMediator()}`,
        )}
        <div class="table-wrapper table-header">
          <details>
            <summary>JSON Config</summary>
            <pre><code>${JSON.stringify(this.cohort, null, 2)}</code></pre>
          </details>
        </div>
      </div>
    `;
  }

  private renderMediatorTable(
    title: string,
    mediators: MediatorProfileExtended[],
    actionBar: TemplateResult,
  ) {
    const renderEmptyMessage = () => {
      if (mediators.length === 0) {
        return html`<div class="table-row">No mediators yet</div>`;
      }
      return nothing;
    };

    const renderMediator = (mediator: MediatorProfileExtended) => {
      const renderStatus = () => {
        return renderMediatorStatusChip(mediator);
      };

      const toggleStatus = async () => {
        this.isStatusLoading = true;
        await this.experimentManager.updateMediatorStatus(
          mediator.privateId,
          mediator.currentStatus === MediatorStatus.ACTIVE
            ? MediatorStatus.PAUSED
            : MediatorStatus.ACTIVE,
        );
        this.isStatusLoading = false;
      };

      const renderPause = () => {
        if (!mediator.agentConfig) {
          return nothing;
        }
        return html`
          <pr-icon-button
            ?loading=${this.isStatusLoading}
            variant="default"
            icon=${mediator.currentStatus === MediatorStatus.PAUSED
              ? 'play_circle'
              : 'pause'}
            @click=${toggleStatus}
          >
          </pr-icon-button>
        `;
      };

      return html`
        <div class="table-row">
          <profile-display .profile=${mediator}></profile-display>
          ${renderStatus()} ${renderPause()}
        </div>
      `;
    };

    return html`
      <div class="table-wrapper">
        <div class="table-header">
          <div>${title}</div>
          <div>${actionBar}</div>
        </div>
        <div class="table-body">
          ${renderEmptyMessage()}
          ${mediators.map((mediator) => renderMediator(mediator))}
        </div>
      </div>
    `;
  }

  private renderParticipantTable(
    title: string,
    participants: ParticipantProfileExtended[],
    actionBar: TemplateResult,
    emptyMessage = 'No participants yet',
  ) {
    const renderEmptyMessage = () => {
      if (participants.length === 0) {
        return html` <div class="table-row">${emptyMessage}</div> `;
      }
      return nothing;
    };

    const isTransferTimeout = (participant: ParticipantProfile) => {
      return participant.currentStatus == ParticipantStatus.TRANSFER_TIMEOUT;
    };

    const isOnTransferStage = (participant: ParticipantProfile) => {
      const stage = this.experimentService.getStage(participant.currentStageId);
      if (!stage) return false; // Return false instead of 'nothing' to ensure it's a boolean
      return stage.kind === StageKind.TRANSFER;
    };

    return html`
      <div class="table-wrapper">
        <div class="table-header">
          <div>${title} (${participants.length})</div>
          <div>${actionBar}</div>
        </div>
        <div class="table-body">
          ${renderEmptyMessage()}
          ${participants
            .slice()
            .sort((a, b) => {
              if (isTransferTimeout(a)) {
                return 1;
              }

              if (isTransferTimeout(b)) {
                return -1;
              }

              const aIsTransfer = isOnTransferStage(a) ? 0 : 1; // 0 if true, 1 if false
              const bIsTransfer = isOnTransferStage(b) ? 0 : 1;
              return (
                aIsTransfer - bIsTransfer ||
                a.publicId.localeCompare(b.publicId)
              );
            })
            .map(
              (participant) => html`
                <participant-summary
                  .participant=${participant}
                ></participant-summary>
              `,
            )}
        </div>
      </div>
    `;
  }

  private isAddParticipantDisabled() {
    if (!this.experimentService.experiment || !this.cohort) {
      return true;
    }
    return (
      this.experimentManager.isFullCohort(this.cohort) ||
      this.experimentService.experiment.cohortLockMap[this.cohort.id]
    );
  }

  private renderAddHumanParticipant() {
    if (!this.cohort) {
      return nothing;
    }

    return html`
      <pr-tooltip text="Add human participant" position="BOTTOM_END">
        <pr-icon-button
          icon="person_add"
          color="tertiary"
          variant="default"
          ?disabled=${this.isAddParticipantDisabled()}
          ?loading=${this.experimentManager.isWritingParticipant}
          @click=${async () => {
            if (!this.cohort) return;
            this.analyticsService.trackButtonClick(ButtonClick.PARTICIPANT_ADD);
            await this.experimentManager.createParticipant(this.cohort.id);
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderAddAgentParticipant() {
    return html`
      <pr-tooltip text="Add agent participant" position="BOTTOM_END">
        <pr-icon-button
          icon="person_add"
          color="tertiary"
          variant="default"
          ?disabled=${this.isAddParticipantDisabled()}
          ?loading=${this.experimentManager.isWritingParticipant}
          @click=${async () => {
            if (!this.cohort) return;
            this.showAgentParticipantDialog = true;
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
      ${this.showAgentParticipantDialog
        ? html`<agent-participant-configuration-dialog
            .cohort=${this.cohort}
            @close=${() => {
              this.showAgentParticipantDialog = false;
            }}
          ></agent-participant-configuration-dialog>`
        : nothing}
    `;
  }

  private renderAddMediator() {
    if (!this.cohort) {
      return nothing;
    }

    const availableMediators =
      this.experimentManager.getAvailableMediatorPersonas(this.cohort.id);
    const isLocked = Boolean(
      this.experimentService.experiment?.cohortLockMap[this.cohort.id],
    );
    const tooltipText = isLocked
      ? 'Unlock cohort to add mediators'
      : availableMediators.length === 0
        ? 'No mediator personas available to add'
        : 'Add agent mediator';

    const isDisabled =
      isLocked ||
      availableMediators.length === 0 ||
      this.experimentManager.isWritingMediator;

    return html`
      <pr-tooltip text=${tooltipText} position="BOTTOM_END">
        <pr-icon-button
          icon="person_add"
          color="tertiary"
          variant="default"
          ?disabled=${isDisabled}
          ?loading=${this.experimentManager.isWritingMediator}
          @click=${() => {
            if (isDisabled) return;
            this.showAgentMediatorDialog = true;
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
      ${this.showAgentMediatorDialog
        ? html`<agent-mediator-add-dialog
            .cohort=${this.cohort}
            @close=${() => {
              this.showAgentMediatorDialog = false;
            }}
          ></agent-mediator-add-dialog>`
        : nothing}
    `;
  }

  private renderLockButton() {
    if (!this.cohort) {
      return nothing;
    }

    const isLocked = this.experimentService.experiment
      ? this.experimentService.experiment.cohortLockMap[this.cohort.id]
      : false;

    const onClick = async () => {
      if (!this.cohort) return;
      await this.experimentManager.setCohortLock(this.cohort.id, !isLocked);
    };

    const text = `${isLocked ? 'Unlock' : 'Lock'} this cohort to ${
      isLocked ? 'enable' : 'disable'
    } participants joining`;
    return html`
      <pr-tooltip text=${text} position="BOTTOM_END">
        <pr-icon-button
          icon=${isLocked ? 'lock' : 'lock_open'}
          color=${isLocked ? 'tertiary' : 'secondary'}
          variant="default"
          @click=${onClick}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  async copyCohortLink() {
    if (!this.cohort) return;

    const basePath = window.location.href.substring(
      0,
      window.location.href.indexOf('/#'),
    );
    const link = `${basePath}/#/e/${this.experimentManager.experimentId}/c/${this.cohort.id}`;

    await navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  }

  private renderCopyButton() {
    return html`
      <pr-tooltip text="Copy experiment cohort link" position="BOTTOM_END">
        <pr-icon-button
          icon="content_copy"
          color="neutral"
          variant="default"
          ?disabled=${!this.cohort}
          @click=${this.copyCohortLink}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderSettingsButton() {
    return html`
      <pr-tooltip text="Edit cohort metadata" position="BOTTOM_END">
        <pr-icon-button
          icon="settings"
          color="neutral"
          variant="default"
          @click=${() => {
            this.experimentManager.setCohortEditing(this.cohort);
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-editor': Component;
  }
}
