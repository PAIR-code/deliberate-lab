import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import '../participant_profile/profile_display';
import '../progress/participant_progress_bar';

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
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  getTimeElapsed,
  getRgbColorInterpolation,
} from '@deliberation-lab/utils';

import {
  getCurrentStageStartTime,
  isObsoleteParticipant,
  isPendingParticipant,
  isParticipantEndedExperiment,
} from '../../shared/participant.utils';

import {styles} from './participant_summary.scss';

/** Participant summary for experimenters. */
@customElement('participant-summary')
export class ParticipantSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() participant: ParticipantProfileExtended | undefined = undefined;

  override render() {
    if (this.participant === undefined) {
      return nothing;
    }
    const setCurrentParticipant = () => {
      if (!this.participant) return;
      this.experimentManager.setCurrentParticipantId(
        this.participant.privateId
      );
    };

    const classes = classMap({
      'participant-summary': true,
      selected:
        this.experimentManager.currentParticipantId ===
        this.participant.privateId,
      old: isObsoleteParticipant(this.participant),
    });

    return html`
      <div class=${classes} @click=${setCurrentParticipant}>
        <div class="left">
          <participant-profile-display .profile=${this.participant}>
          </participant-profile-display>
          ${this.renderStatus()} ${this.renderAttentionStatus()}
          ${this.renderTimeElapsed()}
        </div>
        <div class="buttons">
          <participant-progress-bar
            .participant=${this.participant}
            .stageIds=${this.experimentService.experiment?.stageIds ?? []}
          >
          </participant-progress-bar>
          ${this.renderCopyButton()} ${this.renderPreviewButton()}
          ${this.renderAttentionButton()} ${this.renderBootButton()}
        </div>
      </div>
    `;
  }

  private renderTimeElapsed() {
    if (
      this.participant === undefined ||
      (this.participant.currentStatus !== ParticipantStatus.IN_PROGRESS &&
      this.participant.currentStatus !== ParticipantStatus.ATTENTION_CHECK)
    ) {
      return;
    }

    const startTime = getCurrentStageStartTime(
      this.participant,
      this.experimentService.stageIds
    );
    if (!startTime) {
      return;
    }
    const numMinutes = getTimeElapsed(startTime, 'm'); // In minutes.
    // Get a color on the scale from green to red; full red is hit at 30 minutes.
    const timeColor = getRgbColorInterpolation(
      '#A8DAB5',
      '#FBA9D6',
      numMinutes,
      30
    );

    const getTimeElapsedText = (numMinutes: number) => {
      const numHours = Math.floor(numMinutes / 60);
      const numDays = Math.floor(numHours / 24);
      const maxDays = 3; // Show "3+ days" after this threshold.
      return numMinutes < 120
        ? `${numMinutes}m`
        : numHours < 24
        ? `${numHours}h`
        : numDays <= maxDays
        ? `${numDays}d`
        : `${maxDays}+ days`;
    };

    return html`
      <div
        class="chip"
        style="color: ${timeColor};"
        title="Time elapsed on current stage"
      >
        ⏳ ${getTimeElapsedText(numMinutes)}
      </div>
    `;
  }

  private renderAttentionStatus() {
    if (this.participant?.currentStatus !== ParticipantStatus.ATTENTION_CHECK) {
      return nothing;
    }
    return html`<div class="chip error">attention check sent</div>`;
  }

  private renderStatus() {
    if (!this.participant) return nothing;

    if (isPendingParticipant(this.participant)) {
      return html`<div class="chip secondary">transfer pending</div>`;
    } else if (isObsoleteParticipant(this.participant)) {
      return html`<div class="chip">${this.participant.currentStatus}</div>`;
    }

    // If in transfer stage, return "ready for transfer" chip
    const stage = this.experimentService.getStage(
      this.participant.currentStageId
    );
    if (!stage) return nothing;
    if (stage.kind === StageKind.TRANSFER) {
      return html`<div class="chip tertiary">ready for transfer!</div>`;
    }

    return nothing;
  }

  async copyParticipantLink() {
    if (!this.participant) return;

    const basePath = window.location.href.substring(
      0,
      window.location.href.indexOf('/#')
    );
    const link = `${basePath}/#/e/${this.experimentManager.experimentId}/p/${this.participant.privateId}`;

    await navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  }

  private renderPreviewButton() {
    const navigate = () => {
      if (!this.participant) return;
      this.routerService.navigate(Pages.PARTICIPANT, {
        experiment: this.experimentManager.experimentId ?? '',
        participant: this.participant?.privateId,
      });
    };

    return html`
      <pr-tooltip text="Preview as participant" position="LEFT_START">
        <pr-icon-button
          icon="slideshow"
          color="neutral"
          variant="default"
          ?disabled=${!this.participant}
          @click=${navigate}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderAttentionButton() {
    const sendAttentionCheck = () => {
      if (!this.participant) return;

      const isConfirmed = window.confirm(
        `Are you sure you want to send an attention check to ${
          this.participant.name
            ? this.participant.name
            : this.participant.publicId
        }?`
      );
      if (!isConfirmed) return;

      this.analyticsService.trackButtonClick(ButtonClick.ATTENTION_CHECK_SEND);
      this.experimentManager.sendCheckToParticipant(
        this.participant.privateId,
        ParticipantStatus.ATTENTION_CHECK
      );
    };

    return html`
      <pr-tooltip
        text="Send attention check to participant"
        position="LEFT_START"
      >
        <pr-icon-button
          icon="warning"
          color="error"
          variant="default"
          ?disabled=${!this.participant ||
          isParticipantEndedExperiment(this.participant) ||
          this.participant.currentStatus === ParticipantStatus.ATTENTION_CHECK}
          @click=${sendAttentionCheck}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderBootButton() {
    const bootParticipant = () => {
      if (!this.participant) return;
      const isConfirmed = window.confirm(
        `Are you sure you want to boot ${
          this.participant.name
            ? this.participant.name
            : this.participant.publicId
        }?`
      );
      if (!isConfirmed) return;

      this.analyticsService.trackButtonClick(ButtonClick.PARTICIPANT_BOOT);
      this.experimentManager.bootParticipant(this.participant.privateId);
    };

    return html`
      <pr-tooltip text="Boot participant from experiment" position="LEFT_START">
        <pr-icon-button
          icon="block"
          color="error"
          variant="default"
          ?disabled=${!this.participant ||
          isParticipantEndedExperiment(this.participant)}
          @click=${bootParticipant}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }

  private renderCopyButton() {
    return html`
      <pr-tooltip text="Copy experiment link" position="LEFT_START">
        <pr-icon-button
          icon="content_copy"
          color="neutral"
          variant="default"
          ?disabled=${!this.participant}
          @click=${this.copyParticipantLink}
        >
        </pr-icon-button>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-summary': ParticipantSummary;
  }
}
