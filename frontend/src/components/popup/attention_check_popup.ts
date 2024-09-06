import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';

import {
  ParticipantStatus
} from '@deliberation-lab/utils';

import {styles} from './popup.scss';

@customElement('attention-check-popup')
class AttentionPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property({type: Number})
  waitSeconds: number = 60; // Default value of 60 seconds

  @property({type: Number})
  popupSeconds: number = 20; // Default value of 20 seconds

  @state()
  private showAttentionCheck = false;

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
    window.addEventListener('mousemove', this.resetAttentionCheck);
    window.addEventListener('keydown', this.resetAttentionCheck);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.resetAttentionCheck);
    window.addEventListener('mousemove', this.resetAttentionCheck);
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

  private handleFailedAttentionCheck = async () => {
    this.showAttentionCheck = false;
    alert('Attention check failed.');

    await this.participantService.submitAttentionCheckFailure();
    const config = this.experimentService.experiment?.prolificConfig;

    if (config && config.enableProlificIntegration) {
      const code = config.attentionFailRedirectCode.length > 0 ?
        config.attentionFailRedirectCode : config.defaultRedirectCode;
      // Navigate to Prolific with completion code
      window.location.href = PROLIFIC_COMPLETION_URL_PREFIX + code;
    } else {
      this.routerService.navigate(Pages.PARTICIPANT, {
        'experiment': this.routerService.activeRoute.params['experiment'],
        'participant': this.routerService.activeRoute.params['participant']
      });
    }
  };

  render() {
    if (!this.showAttentionCheck) {
      return nothing;
    }

    return html`
      <div class="overlay">
        <div class="popup">
          <div class="title">
            Are you still there?
          </div>
          <div class="content">
            <div>Time remaining until experiment ends:</div>
            <div class="time">${this.countdown} seconds</div>
          </div>
          <div class="button-row">
            <div class="button-container">
              <pr-button
                color="primary"
                variant="tonal"
                @click=${this.handleAttentionCheckResponse}
              >
                Yes, continue experiment
              </pr-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'attention-check-popup': AttentionPopup;
  }
}