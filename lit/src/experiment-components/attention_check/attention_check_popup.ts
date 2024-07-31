import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment_service';
import {ParticipantService} from '../../services/participant_service';
import {Pages, RouterService} from '../../services/router_service';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';
import {styles} from './attention_check_popup.scss';

@customElement('attention-check-popup')
export class AttentionCheckPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state()
  private showAttentionCheck = false;

  @property({type: Number})
  waitSeconds: number = 60; // Default value of 60 seconds

  @property({type: Number})
  popupSeconds: number = 20; // Default value of 20 seconds

  @state()
  private attentionCheckTimeoutId: number | undefined;

  @state()
  private attentionCheckDeadlineId: number | undefined;

  @state()
  private countdown: number = 20;

  connectedCallback() {
    super.connectedCallback();
    this.resetAttentionCheck();
    window.addEventListener('click', this.resetAttentionCheck);
    window.addEventListener('keydown', this.resetAttentionCheck);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.resetAttentionCheck);
    window.removeEventListener('keydown', this.resetAttentionCheck);
    this.clearAttentionCheckTimeouts();
  }

  private resetAttentionCheck = () => {
    this.clearAttentionCheckTimeouts();
    this.attentionCheckTimeoutId = window.setTimeout(
      this.showAttentionCheckPopup,
      this.waitSeconds * 1000
    );
  };

  private clearAttentionCheckTimeouts() {
    if (this.attentionCheckTimeoutId !== undefined) {
      clearTimeout(this.attentionCheckTimeoutId);
      this.attentionCheckTimeoutId = undefined;
    }
    if (this.attentionCheckDeadlineId !== undefined) {
      clearTimeout(this.attentionCheckDeadlineId);
      this.attentionCheckDeadlineId = undefined;
    }
  }

  private showAttentionCheckPopup = () => {
    this.showAttentionCheck = true;
    this.countdown = this.popupSeconds;
    this.attentionCheckDeadlineId = window.setTimeout(
      this.handleFailedAttentionCheck,
      this.countdown * 1000
    );
    this.startCountdown();
  };

  private startCountdown() {
    const countdownIntervalId = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        clearInterval(countdownIntervalId);
      }
    }, 1000);
  }

  private handleAttentionCheckResponse = () => {
    this.showAttentionCheck = false;
    this.resetAttentionCheck();
  };

  private handleFailedAttentionCheck = () => {
    this.showAttentionCheck = false;
    alert('Attention check failed.');
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
  };

  override render() {
    if (!this.showAttentionCheck) {
      return nothing;
    }
    return html`
      <div class="attention-check-popup">
        <div class="attention-check-content">
          Are you still there?
          <div>
            <small>Time remaining until experiment ends: ${this.countdown} seconds</sma..L
          </div>
          <pr-button color="tertiary" variant="tonal" @click=${this.handleAttentionCheckResponse}>YES</pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'attention-check-popup': AttentionCheckPopup;
  }
}
