import './stage_description';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {
  getTimeElapsed,
  ParticipantStatus,
  TransferStageConfig,
  getRgbColorInterpolation,
} from '@deliberation-lab/utils';

import {getCurrentStageStartTime} from '../../shared/participant.utils';

import {styles} from './transfer_view.scss';

/** Transfer stage view for participants. */
@customElement('transfer-view')
export class TransferView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() stage: TransferStageConfig | null = null;

  // Timeout states
  @state() countdownInterval: number | undefined = undefined;
  @state() timeRemainingSeconds: number = 600;

  connectedCallback() {
    super.connectedCallback();
    // If timeout, start countdown
    if (this.stage?.enableTimeout) {
      this.startCountdown();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearCountdown();
  }

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      ${this.renderCompletedStage()} ${this.renderCountdown()}
    `;
  }

  private renderCompletedStage() {
    const onClick = () => {
      // Route to current stage
      this.participantService.setCurrentStageView(undefined);
    };

    if (this.participantService.completedStage(this.stage?.id ?? '')) {
      return html`
        <div class="transfer-wrapper">
          <div>Your transfer is complete.</div>
          <pr-button @click=${onClick}>Proceed to current stage</pr-button>
        </div>
      `;
    }
    return nothing;
  }

  private renderCountdown() {
    if (
      !this.stage?.enableTimeout ||
      this.participantService.completedStage(this.stage.id ?? '')
    )
      return;

    const minutes = Math.floor(this.timeRemainingSeconds / 60);
    const seconds = this.timeRemainingSeconds % 60;

    const timeColor = getRgbColorInterpolation(
      '#A8DAB5', // Green
      '#FBA9D6', // Red
      this.timeRemainingSeconds,
      this.stage?.timeoutSeconds,
    );

    return html`
      <div class="transfer-wrapper">
        <div>
          If the transfer cannot be completed, the experiment will end in:
          <span style="font-weight: bold; color: ${timeColor};">
            ${minutes}:${seconds.toString().padStart(2, '0')} (mm:ss) </span
          >.
        </div>
      </div>
    `;
  }

  handleTimedOut() {
    this.clearCountdown();

    // Don't end experiment if experiment is already over
    // or if experimenter is previewing
    if (
      this.authService.isExperimenter ||
      this.participantService.completedStage(this.stage?.id ?? '')
    ) {
      return;
    }

    alert('Thanks for waiting. The experiment has ended.');
    this.participantService.updateExperimentFailure(
      ParticipantStatus.TRANSFER_TIMEOUT,
      true,
    );
  }

  startCountdown() {
    this.clearCountdown(); // Ensure no previous intervals are running
    if (!this.stage) {
      return;
    }
    const startTime = getCurrentStageStartTime(
      this.participantService.profile!,
      this.experimentService.stageIds,
    )!;
    const secondsElapsed = getTimeElapsed(startTime, 's');
    this.timeRemainingSeconds = this.stage.timeoutSeconds - secondsElapsed;
    if (this.timeRemainingSeconds < 0) {
      this.handleTimedOut();
    }

    this.countdownInterval = window.setInterval(() => {
      if (this.timeRemainingSeconds > 0) {
        this.timeRemainingSeconds -= 1;
      } else {
        this.handleTimedOut();
      }
    }, 1000);
  }

  clearCountdown() {
    if (this.countdownInterval !== undefined) {
      window.clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-view': TransferView;
  }
}
