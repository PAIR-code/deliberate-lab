import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {Pages, RouterService} from '../../services/router.service';
import {styles} from './stage_footer.scss';

/** Experiment stage footer */
@customElement('stage-footer')
export class Footer extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  @property() disabled = false;
  @property() showNextButton = true;

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

    const handleNext = async () => {
      // TODO: Progress to next stage OR end experiment
    };

    const preventNextClick = this.disabled;

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
