import "../../pair-components/button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { core } from "../../core/core";
import { ExperimentService } from "../../services/experiment_service";
import { ParticipantService } from "../../services/participant_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./footer.scss";

/** Experiment stage footer */
@customElement("stage-footer")
export class Footer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() disabled = true; // Initially disabled
  @state() private timeRemaining = 5 * 60; // Set initial countdown time to 5 minutes (300 seconds)

  private countdownInterval: number | undefined;

  connectedCallback() {
    super.connectedCallback();
    if (this.experimentService.experiment?.isLobby) {
      this.startCountdown();
    } else {
      this.disabled = false; // Enable the button if it's not a lobby experiment
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearCountdown();
  }

  startCountdown() {
    this.clearCountdown(); // Ensure no previous intervals are running
    this.countdownInterval = window.setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining -= 1;
      } else {
        this.disabled = false; // Enable the button when countdown reaches zero
        this.clearCountdown();
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

  override render() {
    return html`
      <div class="footer">
        <div class="left">
          <slot></slot>
        </div>
        <div class="right">
          ${this.renderNextStageButton()}
        </div>
      </div>
    `;
  }

  private renderNextStageButton() {
    const index = this.experimentService.getStageIndex(
      this.participantService.profile?.currentStageId ?? ""
    );

    const isLastStage = index === this.experimentService.stageIds.length - 1;

    const handleNext = () => {
      const nextStageId = this.experimentService.getNextStageId(
        this.participantService.profile?.currentStageId ?? ""
      );

      if (nextStageId !== null) {
        this.participantService.updateCurrentStageId(nextStageId);
        this.routerService.navigate(
          Pages.PARTICIPANT_STAGE,
          {
            "experiment": this.participantService.experimentId!,
            "participant": this.participantService.participantId!,
            "stage": nextStageId,
          }
        );
      } else {
        // TODO: navigate to an end-of-experiment payout page
        this.participantService.markExperimentCompleted();
        alert("Experiment completed!");
        this.routerService.navigate(
          Pages.PARTICIPANT,
          {
            "experiment": this.participantService.experimentId!,
            "participant": this.participantService.participantId!,
          }
        )
      }
    };

    const preventNextClick = this.disabled ||
      !this.participantService.isCurrentStage();

    const handleTransfer = () => {
      const transferConfig = this.participantService.profile?.transferConfig;
      if (!transferConfig) {
        return;
      }

      this.routerService.navigate(
        Pages.PARTICIPANT,
        {
          "experiment": transferConfig.experimentId,
          "participant": transferConfig.participantId,
        }
      );
    }

    // If completed lobby experiment, render link to transfer experiment
    if (isLastStage && this.experimentService.experiment?.isLobby) {
      // If transfer experiment has been assigned
      if (this.participantService.profile?.transferConfig) {
        alert('You have been routed to a new experiment!');
        return html`
          <pr-button
            variant=${this.disabled ? "default" : "tonal"}
            ?disabled=${preventNextClick}
            @click=${handleTransfer}
          >
            Go to new experiment
          </pr-button>
        `;
      } else {
          return html`
            <pr-button
              variant=${this.disabled ? "default" : "tonal"}
              ?disabled=${preventNextClick}
              @click=${handleNext}
            >
              ${isLastStage ? "End experiment" : "Next stage"} 
              ${this.experimentService.experiment?.isLobby && this.disabled ? ` (${this.formatTime(this.timeRemaining)})` : ""}
            </pr-button>
          `;
      }
    }

    return html`
      <pr-button
        variant=${this.disabled ? "default" : "tonal"}
        ?disabled=${preventNextClick}
        @click=${handleNext}
      >
        ${isLastStage ? "End experiment" : "Next stage"} 
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "stage-footer": Footer;
  }
}
