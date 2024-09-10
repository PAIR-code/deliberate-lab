import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {HomeService} from '../../services/home.service';
import {ParticipantService} from '../../services/participant.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  StageConfig
} from '@deliberation-lab/utils';

import {styles} from './participant_nav.scss';

/** Sidenav for participant's experiment view */
@customElement('participant-nav')
export class ParticipantNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  override render() {
    const navigateToLanding = () => {
      const params = this.routerService.activeRoute.params;
      this.routerService.navigate(Pages.PARTICIPANT, {
        'experiment': params['experiment'],
        'participant': params['participant'],
      });
    };

    return html`
      <div class="title" @click=${navigateToLanding}>
        <div>${this.experimentService.experimentName}</div>
      </div>
      <div class="stages">
        ${this.renderStages()}
      </div>
    `;
  }

  private renderStages() {
    let stages = this.experimentService.stages;

    // If not experimenter, filter out stages that aren't available yet
    if (!this.authService.isExperimenter) {
      stages = stages.filter(
        stage => this.participantService.canAccessStage(stage.id)
      );
    }

    return stages.map(
      (stage, index) => this.renderStageItem(stage, index)
    );
  }

  private renderStageItem(stage: StageConfig, index: number) {
    const navItemClasses = classMap({
      'nav-item': true,
      'experimenter-only': !this.participantService.canAccessStage(stage.id),
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
          <div>${index + 1}. ${stage.name}</div>
          ${this.participantService.isCurrentStage(stage.id) ?
            html`<div class="chip tertiary">current</div>`
            : nothing
          }
          ${this.participantService.completedStage(stage.id) ?
            html`<pr-icon icon="check_circle" size="small"></pr-icon>`
            : nothing}
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
