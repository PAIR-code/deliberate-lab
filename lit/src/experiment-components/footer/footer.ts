import '../../pair-components/button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment_service';
import {ParticipantService} from '../../services/participant_service';
import {Pages, RouterService} from '../../services/router_service';

import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';
import {styles} from './footer.scss';

/** Experiment stage footer */
@customElement('stage-footer')
export class Footer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() disabled = true; // Initially disabled
  // TODO: Make this parameterized.
  @state() private timeRemaining = 5 * 60; // Set initial countdown time to 5 minutes (300 seconds)

  private countdownInterval: number | undefined;

  connectedCallback() {
    super.connectedCallback();
    if (
      this.experimentService.experiment?.isLobby &&
      !this.participantService.profile?.transferConfig
    ) {
      this.startCountdown();
    } else {
      this.disabled = false; // Enable the button if it's not a lobby experiment
      this.clearCountdown();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearCountdown();
  }

  handleTimedOut() {
    this.clearCountdown();
    alert('Time is up, the experiment has ended!');
    this.redirectEndExperiment();
  }

  startCountdown() {
    this.clearCountdown(); // Ensure no previous intervals are running
    this.countdownInterval = window.setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining -= 1;
      } else {
        this.disabled = false; // Enable the button when countdown reaches zero
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

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  redirectEndExperiment() {
    this.participantService.markExperimentCompleted();

    if (this.experimentService.experiment?.prolificRedirectCode) {
      // Navigate to Prolific with completion code.
      window.location.href =
        PROLIFIC_COMPLETION_URL_PREFIX +
        this.experimentService.experiment?.prolificRedirectCode;
    } else {
      // TODO: navigate to an end-of-experiment payout page
      this.routerService.navigate(Pages.HOME);
    }
  }
  override render() {
    return html`
      <div class="footer">
        <div class="left">
          <slot></slot>
        </div>
        <div class="right">${this.renderNextStageButton()}</div>
      </div>
    `;
  }

  private renderNextStageButton() {
    const index = this.experimentService.getStageIndex(
      this.participantService.profile?.currentStageId ?? ''
    );

    const isLastStage = index === this.experimentService.stageIds.length - 1;

    const handleNext = () => {
      const nextStageId = this.experimentService.getNextStageId(
        this.participantService.profile?.currentStageId ?? ''
      );

      if (nextStageId !== null) {
        this.participantService.updateCurrentStageId(nextStageId);
        this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
          experiment: this.participantService.experimentId!,
          participant: this.participantService.participantId!,
          stage: nextStageId,
        });
      } else {
        alert('Experiment completed!');
        this.redirectEndExperiment();
      }
    };

    const preventNextClick =
      this.disabled || !this.participantService.isCurrentStage();

    const handleTransfer = () => {
      const transferConfig = this.participantService.profile?.transferConfig;
      if (!transferConfig) {
        return;
      }

      this.participantService.markExperimentCompleted();
      this.routerService.navigate(Pages.PARTICIPANT, {
        experiment: transferConfig.experimentId,
        participant: transferConfig.participantId,
      });
    };

    // If completed lobby experiment, render link to transfer experiment
    if (isLastStage && this.experimentService.experiment?.isLobby) {
      // If transfer experiment has been assigned
      if (this.participantService.profile?.transferConfig) {
        alert("You've been transferred to a new experiment!");
        this.clearCountdown();
        return html`
          <pr-button variant="tonal" } @click=${handleTransfer}>
            Go to new experiment
          </pr-button>
        `;
      } else {
        return html`
          <pr-button
            variant=${this.disabled ? 'default' : 'tonal'}
            ?disabled=${preventNextClick}
            @click=${handleNext}
          >
            ${isLastStage ? 'End experiment' : 'Next stage'}
            ${this.experimentService.experiment?.isLobby && this.disabled
              ? ` (${this.formatTime(this.timeRemaining)})`
              : ''}
          </pr-button>
        `;
      }
    }

    return html`
      <pr-button
        variant=${this.disabled ? 'default' : 'tonal'}
        ?disabled=${preventNextClick}
        @click=${handleNext}
      >
        ${isLastStage ? 'End experiment' : 'Next stage'}
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-footer': Footer;
  }
}
