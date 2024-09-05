import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {styles} from './stage_footer.scss';

/** Experiment stage footer */
@customElement('stage-footer')
export class Footer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() disabled = false;
  @property() showNextButton = true;
  @property() onNextClick: () => void = () => {};

  override render() {
    return html`
      <div class="left">
        <slot></slot>
      </div>
      <div class="right">${this.renderNextStageButton()}</div>
    `;
  }

  private renderEndExperimentButton() {
    if (!this.participantService.isLastStage) {
      return nothing;
    }

    const handleNext = async () => {
      // Handle custom onNextClick
      await this.onNextClick();
      // Save last stage and mark experiment as completed
      await this.participantService.completeLastStage();
      // Navigate to landing
      this.routerService.navigate(Pages.PARTICIPANT, {
        experiment: this.routerService.activeRoute.params['experiment'],
        participant: this.routerService.activeRoute.params['participant'],
      });
    };

    const preventNextClick = this.disabled || this.participantService.disableStage;
    return html`
      <pr-button
        variant=${this.disabled ? 'default' : 'tonal'}
        ?disabled=${preventNextClick}
        @click=${handleNext}
      >
        Save and complete experiment
      </pr-button>
    `;
  }

  private renderNextStageButton() {
    if (!this.showNextButton) {
      return nothing;
    }

    // If last stage, end experiment
    if (this.participantService.isLastStage()) {
      return this.renderEndExperimentButton();
    }

    const handleNext = async () => {
      // Handle custom onNextClick
      await this.onNextClick();
      // Progress to next stage
      await this.participantService.progressToNextStage();
      // Navigate to new stage
      this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
        experiment: this.routerService.activeRoute.params['experiment'],
        participant: this.routerService.activeRoute.params['participant'],
        stage: this.participantService.profile?.currentStageId ?? '',
      });
    };

    const preventNextClick = this.disabled || this.participantService.disableStage;

    return html`
      <pr-button
        variant=${this.disabled ? 'default' : 'tonal'}
        ?disabled=${preventNextClick}
        @click=${handleNext}
      >
        Next stage
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-footer': Footer;
  }
}
