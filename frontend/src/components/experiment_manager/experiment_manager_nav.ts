import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import './cohort_summary';

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
      <div class="experiment-manager">
        ${this.renderHeader()}
        ${this.renderContent()}
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="header">
        <div class="left">
          <div>
            ${this.experimentManager.numCohorts} cohorts
          </div>
          <small>
            (${this.experimentManager.getNumParticipants()} participants)
          </small>
        </div>
        <div class="right">
          <pr-button
            color="secondary"
            variant="tonal"
            ?loading=${this.experimentManager.isWritingCohort}
            @click=${() => { this.experimentManager.writeCohort() }}
          >
            Add cohort
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderContent() {
    if (this.experimentManager.cohortList.length === 0) {
      return html`
        <div class="empty-message">
          <div>
            To run your experiment, create a cohort and share
            the link with participants.
          </div>
          <div>
            Note that participants can only interact (group chats,
            elections) with participants in the same cohort.
          </div>
        </div>
      `;
    }

    return html`
      <div class="content">
        ${this.experimentManager.cohortList.map(
          cohort => html`<cohort-summary .cohort=${cohort}></cohort-summary>`
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-manager-nav': ExperimentManagerNav;
  }
}
