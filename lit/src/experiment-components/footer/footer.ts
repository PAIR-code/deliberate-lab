import '../../experiment-components/popup/transfer_popup';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment_service';
import {ParticipantService} from '../../services/participant_service';
import {Pages, RouterService} from '../../services/router_service';
import {SurveyService} from '../../services/survey_service';

import {PARTICIPANT_COMPLETION_TYPE} from '@llm-mediation-experiments/utils';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';
import {styles} from './footer.scss';

/** Experiment stage footer */
@customElement('stage-footer')
export class Footer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);
  private readonly surveyService = core.getService(SurveyService);

  @property() disabled = false;
  @state() private timeRemaining: number = 10;
  @state() private showTransferPopup = false;
  private countdownInterval: number | undefined;

  isOnLastStage() {
    const index = this.experimentService.getStageIndex(
      this.participantService.profile?.currentStageId ?? ''
    );

    return index === this.experimentService.stageIds.length - 1;
  }

  addLobbyListener() {
    return (
      this.experimentService.experiment?.lobbyConfig.isLobby &&
      !this.participantService.profile?.transferConfig &&
      this.isOnLastStage() &&
      this.experimentService.experiment?.lobbyConfig.waitSeconds! >= 0
    );
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.addLobbyListener()) {
      this.timeRemaining =
        this.experimentService.experiment?.lobbyConfig.waitSeconds!;

      this.startCountdown();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearCountdown();
  }

  handleTimedOut() {
    this.clearCountdown();
    alert('Thanks for waiting in the lobby. The experiment has ended.');
    this.redirectEndExperiment(PARTICIPANT_COMPLETION_TYPE.LOBBY_TIMEOUT);
  }

  startCountdown() {
    if (!this.experimentService.experiment?.lobbyConfig.waitSeconds) {
      return;
    }
    this.clearCountdown(); // Ensure no previous intervals are running
    this.disabled = true;
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
    this.disabled = false;
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

  redirectEndExperiment(
    completionType: PARTICIPANT_COMPLETION_TYPE = PARTICIPANT_COMPLETION_TYPE.SUCCESS
  ) {
    this.participantService.markExperimentCompleted(completionType);

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

  private handleTransfer() {
    this.showTransferPopup = false;
    const transferConfig = this.participantService.profile?.transferConfig;
    if (!transferConfig) {
      return;
    }

    this.participantService.markExperimentCompleted();
    this.routerService.navigate(Pages.PARTICIPANT, {
      experiment: transferConfig.experimentId,
      participant: transferConfig.participantId,
    });
  }

  override render() {
    return html`
      <div class="footer">
        <div class="left">
          <slot></slot>
        </div>
        <div class="right">${this.renderNextStageButton()}</div>
      </div>

      <!-- Popup listener -->
      <transfer-popup
        .open=${this.showTransferPopup}
        @confirm-transfer=${this.handleTransfer}
      ></transfer-popup>
    `;
  }

  private renderNextStageButton() {
    const isLastStage = this.isOnLastStage();
    if (
      this.participantService.profile?.completionType ===
      PARTICIPANT_COMPLETION_TYPE.BOOTED_OUT
    ) {
      alert('You have been removed from this experiment.');
      this.routerService.navigate(Pages.HOME);
    }

    const handleNext = async () => {
      // If survey stage, save relevant text answers
      if (
        this.surveyService.stageId ===
        this.participantService.profile?.currentStageId
      ) {
        await this.surveyService.saveTextAnswers();
      }

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
      this.disabled ||
      !this.participantService.isCurrentStage() ||
      this.participantService.profile?.completedExperiment;

    // If completed lobby experiment, render link to transfer experiment
    if (isLastStage && this.experimentService.experiment?.lobbyConfig.isLobby) {
      // If transfer experiment has been assigned
      if (this.participantService.profile?.transferConfig) {
        this.clearCountdown();
        this.showTransferPopup = true;
        return null;
      } else {
        return html`
          <pr-button variant="tonal" ?disabled=${true} @click=${handleNext}>
            ${isLastStage ? 'End experiment' : 'Next stage'}
            ${this.experimentService.experiment?.lobbyConfig.isLobby &&
            this.disabled
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
