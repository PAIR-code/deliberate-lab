import '../../pair-components/button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentService} from '../../services/experiment.service';
import {FirebaseService} from '../../services/firebase.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  StageKind
} from '@deliberation-lab/utils';

import { createParticipantCallable } from '../../shared/callables';

import {styles} from './cohort_landing.scss';

/** Cohort landing page where participants join experiment */
@customElement('cohort-landing')
export class CohortLanding extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentService = core.getService(ExperimentService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);

  @state() isLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this.experimentService.updateForCurrentRoute();
  }

  override render() {
    return html`
      <div class="title">${this.experimentService.experimentName}</div>
      <pr-button
        ?loading=${this.isLoading}
        @click=${this.joinExperiment}>
        Join experiment
      </pr-button>
    `;
  }

  private async joinExperiment() {
    this.isLoading = true;
    const params = this.routerService.activeRoute.params;
    const response = await createParticipantCallable(
      this.firebaseService.functions, {
        experimentId: params['experiment'],
        cohortId: params['cohort'],
      }
    );
    // Route to participant page
    this.routerService.navigate(Pages.PARTICIPANT, {
      experiment: params['experiment'],
      participant: response.id,
    });
    this.isLoading = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-landing': CohortLanding;
  }
}
