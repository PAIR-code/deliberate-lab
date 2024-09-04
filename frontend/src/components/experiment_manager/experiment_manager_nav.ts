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
import {ExperimentManager} from '../../services/experiment.manager';

import {styles} from './experiment_manager_nav.scss';

/** Sidenav for experiment manager */
@customElement('experiment-manager-nav')
export class ExperimentManagerNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    return html`
      <div>No cohorts yet.</div>
      <pr-button
        ?loading=${this.experimentManager.isWritingCohort}
        @click=${() => { this.experimentManager.writeCohort() }}
      >
        Add cohort
      </pr-button>
      <div>${JSON.stringify(this.experimentManager.cohortMap)}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-manager-nav': ExperimentManagerNav;
  }
}
