import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement} from 'lit/decorators.js';
import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {styles} from './popup.scss';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';

import {ParticipantStatus} from '@deliberation-lab/utils';

@customElement('booted-popup')
class BootedPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  render() {
    return html`
      <div class="overlay">
        <div class="popup">
          <div class="title">You have been removed from the experiment.</div>
          <p>
            The experiment ended due to either a failed attention check or a
            technical issue (e.g., system error, other participants leaving).<br />If
            it was a technical issue, you will be fully compensated for your
            time.
          </p>
          <p class="subtitle">
            Please contact the administrator if you have any questions.
          </p>
          <div class="button-row">
            <div class="button-container">
              <pr-button
                color="primary"
                variant="tonal"
                @click=${this.handleExit}
              >
                Exit experiment
              </pr-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private async handleExit() {
    await this.participantService.routeToEndExperiment(
      ParticipantStatus.BOOTED_OUT,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'booted-popup': BootedPopup;
  }
}
