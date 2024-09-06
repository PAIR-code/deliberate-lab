import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';

import {
  ParticipantStatus
} from '@deliberation-lab/utils';

import {styles} from './popup.scss';

@customElement('transfer-popup')
class TransferPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  render() {
    return html`
      <div class="overlay">
        <div class="popup">
          <div class="title">You have been transferred to a new experiment!</div>
          <div class="button-row">
            <div class="button-container">
              <pr-button color="error" variant="tonal" @click=${this.handleNo}>
                Decline the invitation
              </pr-button>
              <p class="subtitle">This will end the experiment</p>
            </div>
            <div class="button-container">
              <pr-button
                color="primary"
                variant="tonal"
                @click=${this.handleYes}
              >
                Join the experiment
              </pr-button>
              <p class="subtitle">
                This will redirect you to the next part of the experiment.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private handleYes() {
    this.participantService.acceptParticipantTransfer();
  }

  private async handleNo() {
    if (!this.participantService.profile) return;

    await this.participantService.updateProfile({
      ...this.participantService.profile,
      currentStatus: ParticipantStatus.TRANSFER_DECLINED
    });

    const prolificConfig = this.experimentService.experiment?.prolificConfig;
    if (prolificConfig?.enableProlificIntegration) {
      // Navigate to Prolific with completion code.
      window.location.href = PROLIFIC_COMPLETION_URL_PREFIX
        + prolificConfig.defaultRedirectCode;
    } else {
      this.routerService.navigate(Pages.PARTICIPANT, {
        'experiment': this.routerService.activeRoute.params['experiment'],
        'participant': this.routerService.activeRoute.params['participant']
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-popup': TransferPopup;
  }
}