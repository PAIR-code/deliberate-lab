import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/tooltip';

import '../participant_profile/profile_display';
import '../progress/cohort_progress_bar';
import './participant_summary';
import './agent_participant_configuration_dialog';
import './agent_mediator_add_dialog';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  CohortConfig,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {getCohortDescription, getCohortName} from '../../shared/cohort.utils';

import {styles} from './cohort_summary.scss';
import {renderMediatorStatusChip} from './mediator_status';

/** Cohort summary for experimenters. */
@customElement('cohort-summary')
export class CohortSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() cohort: CohortConfig | undefined = undefined;
  @property() isExpanded = true;
  @state() showAgentParticipantDialog = false;
  @state() showAgentMediatorDialog = false;

  override render() {
    if (this.cohort === undefined) {
      return nothing;
    }

    return html`
      <div class="cohort-summary">
        ${this.renderHeader()} ${this.renderBody()}
      </div>
      ${this.showAgentParticipantDialog
        ? html`<agent-participant-configuration-dialog
            .cohort=${this.cohort}
            @close=${() => {
              this.showAgentParticipantDialog = false;
            }}
          ></agent-participant-configuration-dialog>`
        : nothing}
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

  private renderHeader() {
    if (!this.cohort) {
      return nothing;
    }

    const setCurrentCohort = () => {
      this.experimentManager.setCurrentCohortId(this.cohort?.id);
    };

    return html`
      <div class="header" @click=${setCurrentCohort}>
        <div class="left">
          <pr-icon-button
            icon=${this.isExpanded
              ? 'keyboard_arrow_up'
              : 'keyboard_arrow_down'}
            color="neutral"
            variant="default"
            @click=${() => {
              this.isExpanded = !this.isExpanded;
            }}
          >
          </pr-icon-button>
          <div class="header-details">
            <div class="top">
              ${this.cohort ? getCohortName(this.cohort) : ''}
              <span class="subtitle">
                (${this.experimentManager.getCohortParticipants(
                  this.cohort.id,
                  false,
                ).length}
                participants)
              </span>
            </div>
            <cohort-progress-bar
              .cohortId=${this.cohort.id}
              .participantList=${this.experimentManager.getCohortParticipants(
                this.cohort.id,
              )}
            >
            </cohort-progress-bar>
          </div>
        </div>
        <div class="right">
          ${this.renderAdd()} ${this.renderLockButton()}
          ${this.renderCopyButton()} ${this.renderEditButton()}
        </div>
      </div>
      ${this.renderDescription()}
    `;
  }

  private renderAdd() {
    const isCohortLocked = this.cohort
      ? Boolean(
          this.experimentService.experiment?.cohortLockMap[this.cohort.id],
        )
      : false;
    const availableMediators = this.cohort
      ? this.experimentManager.getAvailableMediatorPersonas(this.cohort.id)
      : [];
    const mediatorDisabled =
      !this.cohort ||
      isCohortLocked ||
      availableMediators.length === 0 ||
      this.experimentManager.isWritingMediator;
    const mediatorHelperText = (() => {
      if (isCohortLocked) {
        return 'Unlock this cohort to add a mediator.';
      }
      if (availableMediators.length === 0) {
        return 'Create a mediator persona to add it here.';
      }
      return '';
    })();

    return html`
      <pr-menu
        name="Add"
        icon="person_add"
        color="tertiary"
        ?loading=${this.experimentManager.isWritingParticipant}
        useIconButton
      >
        <div class="menu-wrapper">
          <div
            class="menu-item"
            @click=${async () => {
              if (!this.cohort) return;
              this.analyticsService.trackButtonClick(
                ButtonClick.PARTICIPANT_ADD,
              );
              await this.experimentManager.createParticipant(this.cohort.id);
            }}
          >
            Add human participant
          </div>
          ${this.authService.showAlphaFeatures
            ? html`
                <div
                  class="menu-item"
                  @click=${() => {
                    if (!this.cohort) return;
                    this.showAgentParticipantDialog = true;
                  }}
                >
                  Add agent participant
                </div>
              `
            : nothing}
          <div
            class=${classMap({
              'menu-item': true,
              disabled: mediatorDisabled,
            })}
            @click=${() => {
              if (mediatorDisabled || !this.cohort) {
                return;
              }
              this.showAgentMediatorDialog = true;
            }}
          >
            <div>Add agent mediator</div>
            ${mediatorHelperText
              ? html`<div class="menu-item-helper">${mediatorHelperText}</div>`
              : nothing}
          </div>
        </div>
      </pr-menu>
    `;
  }

  private renderDescription() {
    if (!this.isExpanded) return nothing;
    const description = getCohortDescription(this.cohort!);
    if (description.length === 0) return nothing;

    return html`<div class="description">${description}</div>`;
  }

  private renderEditButton() {
    return html`
      <pr-tooltip text="Manage this cohort" position="BOTTOM_END">
        <pr-icon-button
          icon="arrow_forward"
          color="neutral"
          variant="default"
          @click=${() => {
            this.experimentManager.setCurrentCohortId(
              this.cohort?.id ?? undefined,
            );
            this.experimentManager.setShowCohortEditor(true, true);
          }}
        >
        </pr-icon-button>
      </pr-tooltip>
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

  private renderBody() {
    if (!this.isExpanded || !this.cohort) {
      return nothing;
    }

    // TODO: Refactor into participant-list component
    const participants = this.experimentManager.getCohortParticipants(
      this.cohort.id,
    );
    const mediators = this.experimentManager.getCohortAgentMediators(
      this.cohort.id,
    );

    if (participants.length === 0 && mediators.length === 0) {
      return html`
        <div class="empty-message">No participants or mediators yet.</div>
      `;
    }

    const isTransferTimeout = (participant: ParticipantProfile) => {
      return participant.currentStatus == ParticipantStatus.TRANSFER_TIMEOUT;
    };

    const isOnTransferStage = (participant: ParticipantProfile) => {
      const stage = this.experimentService.getStage(participant.currentStageId);
      if (!stage) return false; // Return false instead of 'nothing' to ensure it's a boolean
      return stage.kind === StageKind.TRANSFER;
    };

    const sortedParticipants = participants.slice().sort((a, b) => {
      if (isTransferTimeout(a)) {
        return 1;
      }

      if (isTransferTimeout(b)) {
        return -1;
      }

      const aIsTransfer = isOnTransferStage(a) ? 0 : 1; // 0 if true, 1 if false
      const bIsTransfer = isOnTransferStage(b) ? 0 : 1;
      return aIsTransfer - bIsTransfer || a.publicId.localeCompare(b.publicId);
    });

    const participantSection = this.renderListSection(
      'Participants',
      sortedParticipants,
      'No participants yet.',
      (participant) => html`
        <participant-summary .participant=${participant}></participant-summary>
      `,
    );

    const mediatorSection = this.renderListSection(
      'Mediators',
      mediators,
      'No mediators yet.',
      (mediator) => html`
        <div class="mediator-row">
          <participant-profile-display .profile=${mediator}>
          </participant-profile-display>
          ${renderMediatorStatusChip(mediator, 'status-chip')}
        </div>
      `,
      {listClass: 'mediator-list'},
    );

    return html`
      <div class="body">${participantSection} ${mediatorSection}</div>
    `;
  }

  private renderListSection<T>(
    title: string,
    items: T[],
    emptyMessage: string,
    renderItem: (item: T, index: number) => TemplateResult | typeof nothing,
    options: {listClass?: string} = {},
  ) {
    const listClasses = ['section-list'];
    if (options.listClass) {
      listClasses.push(options.listClass);
    }

    return html`
      <div class="section">
        <div class="section-title">${title}</div>
        <div class=${listClasses.join(' ')}>
          ${items.length === 0
            ? html`<div class="empty-subsection">${emptyMessage}</div>`
            : items.map((item, index) => renderItem(item, index))}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-summary': CohortSummary;
  }
}
