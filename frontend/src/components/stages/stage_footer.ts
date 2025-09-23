import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';
import {styles} from './stage_footer.scss';
import {ParticipantStatus} from '@deliberation-lab/utils';

/** Experiment stage footer */
@customElement('stage-footer')
export class Footer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @property() disabled = false;
  @property() showNextButton = true;
  @property() onNextClick: () => void = async () => {
    await this.participantService.progressToNextStage();
  };

  @state() isLoadingNext = false;

  override render() {
    return html`
      <div class="left">
        <slot></slot>
      </div>
      <div class="right">${this.renderNextStageButton()}</div>
    `;
  }

  private renderNextStageButton() {
    if (!this.showNextButton) {
      return nothing;
    }

    // If last stage, end experiment
    const isLast = this.participantService.isLastStage();

    const handleNext = async () => {
      this.isLoadingNext = true;
      await this.onNextClick();
      this.isLoadingNext = false;
    };

    const preventNextClick =
      this.disabled || this.participantService.disableStage;

    return html`
      <pr-button
        variant=${this.disabled ? 'default' : 'tonal'}
        size="medium"
        ?disabled=${preventNextClick}
        ?loading=${this.isLoadingNext}
        @click=${handleNext}
      >
        ${isLast ? 'End experiment' : 'Next stage'}
      </pr-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'stage-footer': Footer;
  }
}
