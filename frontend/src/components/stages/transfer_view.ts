import './stage_description';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ParticipantService} from '../../services/participant.service';
import {
  ParticipantStatus,
  TransferStageConfig
} from '@deliberation-lab/utils';

import {styles} from './transfer_view.scss';

/** Transfer stage view for participants. */
@customElement('transfer-view')
export class TransferView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: TransferStageConfig | null = null;

  // Timeout states
  @state() countdownInterval: number|undefined = undefined;
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
      ${this.renderCountdown()}
      ${this.renderOverlay()}
    `;
  }

  private renderOverlay() {
    if (!this.stage?.enableTimeout
      || this.participantService.completedStage(this.stage.id ?? '')
      || this.authService.isExperimenter) return;

    // Temporary solution: Prevent participant from clicking to other
    // stages and resetting the transfer countdown
    return html`<div class="overlay"></div>`;
  }

  private renderCountdown() {
    if (!this.countdownInterval) return;

    return html`
      <div>Time remaining: ${this.timeRemainingSeconds} seconds</div>
    `;
  }

  handleTimedOut() {
    this.clearCountdown();

    // Don't end experiment if experiment is already over
    // or if experimenter is previewing
    if (this.authService.isExperimenter
      || this.participantService.completedStage(this.stage?.id ?? '')) {
      return;
    }

    alert('Thanks for waiting. The experiment has ended.');
    this.participantService.updateExperimentFailure(
      ParticipantStatus.TRANSFER_TIMEOUT,
      true
    );
  }

  startCountdown() {
    this.clearCountdown(); // Ensure no previous intervals are running
    if (this.stage) {
      this.timeRemainingSeconds = this.stage.timeoutSeconds;
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