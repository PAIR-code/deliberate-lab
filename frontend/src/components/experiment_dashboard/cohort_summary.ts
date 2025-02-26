import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import '../progress/cohort_progress_bar';
import './participant_summary';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  CohortConfig,
  ParticipantProfile,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {getCohortDescription, getCohortName} from '../../shared/cohort.utils';

import {styles} from './cohort_summary.scss';
import {ParticipantProfileExtended} from '@deliberation-lab/utils';

/** Cohort summary for experimenters. */
@customElement('cohort-summary')
export class CohortSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() cohort: CohortConfig | undefined = undefined;
  @property() isExpanded = true;

  override render() {
    if (this.cohort === undefined) {
      return nothing;
    }

    return html`
      <div class="cohort-summary">
        ${this.renderHeader()} ${this.renderBody()}
      </div>
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

    return html`
      <div class="header">
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
          ${this.renderAddParticipantButton()} ${this.renderLockButton()}
          ${this.renderCopyButton()} ${this.renderSettingsButton()}
        </div>
      </div>
      ${this.renderDescription()}
    `;
  }

  private renderDescription() {
    if (!this.isExpanded) return nothing;
    const description = getCohortDescription(this.cohort!);
    if (description.length === 0) return nothing;

    return html`<div class="description">${description}</div>`;
  }

  private renderSettingsButton() {
    return html`
      <pr-tooltip text="Edit cohort settings" position="BOTTOM_END">
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

  private renderAddParticipantButton() {
    if (!this.cohort) {
      return nothing;
    }

    const isDisabled = () => {
      if (!this.experimentService.experiment || !this.cohort) {
        return true;
      }
      return (
        this.experimentManager.isFullCohort(this.cohort) ||
        this.experimentService.experiment.cohortLockMap[this.cohort.id]
      );
    };

    return html`
      <pr-tooltip text="Add participant" position="BOTTOM_END">
        <pr-icon-button
          icon="person_add"
          color="tertiary"
          variant="default"
          ?disabled=${isDisabled()}
          ?loading=${this.experimentManager.isWritingParticipant}
          @click=${async () => {
            if (!this.cohort) return;
            this.analyticsService.trackButtonClick(ButtonClick.PARTICIPANT_ADD);
            await this.experimentManager.createParticipant(this.cohort.id);
            this.isExpanded = true;
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

    const participants = this.experimentManager.getCohortParticipants(
      this.cohort.id,
    );

    if (participants.length === 0) {
      return html` <div class="empty-message">No participants yet.</div> `;
    }

    const isTransferTimeout = (participant: ParticipantProfile) => {
      return participant.currentStatus == ParticipantStatus.TRANSFER_TIMEOUT;
    };


    const isOnTransferStage = (participant: ParticipantProfile) => {
      const stage = this.experimentService.getStage(participant.currentStageId);
      if (!stage) return false; // Return false instead of 'nothing' to ensure it's a boolean
      return stage.kind === StageKind.TRANSFER;
    };

    return html`
      <div class="body">
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
              aIsTransfer - bIsTransfer || a.publicId.localeCompare(b.publicId)
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-summary': CohortSummary;
  }
}
