import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';

import {ParticipantStatus, StageKind} from '@deliberation-lab/utils';

import {styles} from './popup.scss';

@customElement('transfer-popup')
class TransferPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state() isAccepting = false;

  render() {
    return html`
      <div class="overlay">
        <div class="popup">
          <div class="title">You have been transferred to a new group!</div>
          <div class="button-row">
            <div class="button-container">
              <pr-button color="error" variant="tonal" @click=${this.handleNo}>
                Decline the invitation
              </pr-button>
              <p class="subtitle">This will end the experiment.</p>
            </div>
            <div class="button-container">
              <pr-button
                color="primary"
                variant="tonal"
                ?loading=${this.isAccepting}
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

  private async handleYes() {
    this.isAccepting = true;
    this.analyticsService.trackButtonClick(ButtonClick.TRANSFER_ACCEPT);
    await this.participantService.acceptParticipantTransfer();
    this.isAccepting = false;
  }

  private async handleNo() {
    if (!this.participantService.profile) return;

    this.analyticsService.trackButtonClick(ButtonClick.TRANSFER_REJECT);
    await this.participantService.updateExperimentFailure(
      ParticipantStatus.TRANSFER_DECLINED,
      true,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-popup': TransferPopup;
  }
}
