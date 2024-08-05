import {MobxLitElement} from '@adobe/lit-mobx';
import {PARTICIPANT_COMPLETION_TYPE} from '@llm-mediation-experiments/utils';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment_service';
import {ParticipantService} from '../../services/participant_service';
import {Pages, RouterService} from '../../services/router_service';
import {SurveyService} from '../../services/survey_service';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../../shared/constants';
import {styles} from './popup.scss';

@customElement('transfer-popup')
class TransferPopup extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);
  private readonly surveyService = core.getService(SurveyService);

  @property({type: Boolean}) open = false;

  render() {
    if (!this.open) return null;
    return html`
      <div class="overlay">
        <div class="popup">
          <p>You have been transferred to a new experiment!</p>
          <div class="button-row">
            <div class="button-container">
              <pr-button
                color="primary"
                variant="tonal"
                @click=${this.handleYes}
              >
                Join the experiment
              </pr-button>
              <p class="subtitle">
                This will redirect you to the<br />next part of the experiment.
              </p>
            </div>
            <div class="button-container">
              <pr-button color="error" variant="tonal" @click=${this.handleNo}>
                Decline the invitation
              </pr-button>
              <p class="subtitle">This will end the experiment.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private handleYes() {
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

  private handleNo() {
    const transferConfig = this.participantService.profile?.transferConfig;
    if (!transferConfig) {
      return;
    }

    this.participantService.markExperimentCompleted(
      PARTICIPANT_COMPLETION_TYPE.LOBBY_DECLINED
    );
    // Delete the participant from the other experiment.
    this.experimentService.deleteParticipant(
      transferConfig.experimentId,
      transferConfig.participantId
    );
    this.routerService.navigate(Pages.PARTICIPANT, {
      experiment: transferConfig.experimentId,
      participant: transferConfig.participantId,
    });

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
  /*
  private handleYes() {
    this.dispatchEvent(new CustomEvent('confirm-transfer'));
  }
  */
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-popup': TransferPopup;
  }
}
