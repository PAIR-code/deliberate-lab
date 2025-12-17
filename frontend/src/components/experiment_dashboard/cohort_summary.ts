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
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {CohortService} from '../../services/cohort.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  CohortConfig,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {getCohortDescription, getCohortName} from '../../shared/cohort.utils';
import {getCurrentStageStartTime} from '../../shared/participant.utils';

import {styles} from './cohort_summary.scss';
import {renderMediatorStatusChip} from './mediator_status';

/** Cohort summary for experimenters. */
@customElement('cohort-summary')
export class CohortSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly cohortService = core.getService(CohortService);
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
          <div
            class="menu-item"
            @click=${() => {
              if (!this.cohort) return;
              this.showAgentParticipantDialog = true;
            }}
          >
            Add agent participant
          </div>
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

    const stageIds = this.experimentService.experiment?.stageIds ?? [];

    const isReadyForTransfer = (participant: ParticipantProfile) => {
      const stage = this.experimentService.getStage(participant.currentStageId);
      return stage?.kind === StageKind.TRANSFER;
    };

    const sortedParticipants = participants.slice().sort((a, b) => {
      if (this.experimentManager.participantSortBy === 'name') {
        const aName = a.name ? a.name : a.publicId;
        const bName = b.name ? b.name : b.publicId;
        return aName.localeCompare(bName, undefined, {
          sensitivity: 'base',
        });
      }

      const aIsReadyForTransfer = isReadyForTransfer(a);
      const bIsReadyForTransfer = isReadyForTransfer(b);

      if (aIsReadyForTransfer !== bIsReadyForTransfer) {
        return aIsReadyForTransfer ? -1 : 1; // Ready for transfer go to the top
      }

      const aTimeout = isTransferTimeout(a);
      const bTimeout = isTransferTimeout(b);

      if (aTimeout !== bTimeout) {
        return aTimeout ? 1 : -1; // Timeouts go to the bottom
      }

      // Sort by last active
      const aStartTime = getCurrentStageStartTime(a, stageIds);
      const bStartTime = getCurrentStageStartTime(b, stageIds);

      if (aStartTime && bStartTime) {
        const diff = aStartTime.seconds - bStartTime.seconds;
        if (diff !== 0) return diff;
        return aStartTime.nanoseconds - bStartTime.nanoseconds;
      } else if (aStartTime && !bStartTime) {
        return -1;
      } else if (!aStartTime && bStartTime) {
        return 1;
      }

      return a.publicId.localeCompare(b.publicId);
    });

    const showMediators = this.experimentManager.showMediatorsInCohortSummary;

    const participantSection = this.renderListSection(
      showMediators ? 'Participants' : '',
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
      <div class="body">
        ${participantSection} ${showMediators ? mediatorSection : nothing}
      </div>
    `;
  }

  private renderListSection<T>(
    title: string,
    items: T[],
    emptyMessage: string,
    renderItem: (item: T, index: number) => TemplateResult | typeof nothing,
    options: {listClass?: string; headerAction?: TemplateResult} = {},
  ) {
    const listClasses = ['section-list'];
    if (options.listClass) {
      listClasses.push(options.listClass);
    }

    return html`
      <div class="section-list">
        ${title || options.headerAction
          ? html`<div class="section-title">
              <span>${title}</span>
              ${options.headerAction ?? nothing}
            </div>`
          : nothing}
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
