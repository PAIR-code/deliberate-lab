import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  StageConfig
} from '@deliberation-lab/utils';
import {ExperimentService} from '../../services/experiment.service';

import {styles} from './participant_nav.scss';

/** Sidenav for participant's experiment view */
@customElement('participant-nav')
export class ParticipantNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    return html`
      <div class="title">
        <div>${this.experimentService.experimentName}</div>
      </div>
      <div class="stages">
        ${this.experimentService.stages.map(
          (stage, index) => this.renderStageItem(stage, index)
        )}
      </div>
    `;
  }

  private renderStageItem(stage: StageConfig, index: number) {
    const navItemClasses = classMap({
      'nav-item': true,
      selected: this.routerService.activeRoute.params['stage'] === stage.id,
    });

    const navigate = () => {
      const params = this.routerService.activeRoute.params;
      this.routerService.navigate(Pages.PARTICIPANT_STAGE, {
        'experiment': params['experiment'],
        'participant': params['participant'],
        'stage': stage.id,
      });
    };

    return html`
      <div class="nav-item-wrapper">
        <div
          class=${navItemClasses}
          role="button"
          @click=${navigate}
        >
          ${index + 1}. ${stage.name}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-nav': ParticipantNav;
  }
}
