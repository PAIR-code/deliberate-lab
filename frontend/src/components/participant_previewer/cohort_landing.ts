import '../../pair-components/button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentService} from '../../services/experiment.service';
import {FirebaseService} from '../../services/firebase.service';
import {Pages, RouterService} from '../../services/router.service';

import {
  StageKind
} from '@deliberation-lab/utils';

import {createParticipantCallable} from '../../shared/callables';
import {requiresAnonymousProfiles} from '../../shared/participant.utils';

import {styles} from './cohort_landing.scss';

/** Cohort landing page where participants join experiment */
@customElement('cohort-landing')
export class CohortLanding extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly firebaseService = core.getService(FirebaseService);
  private readonly routerService = core.getService(RouterService);

  @state() isLoading = false;

  override render() {
    return html`
      <div class="main">
        <h1>${this.experimentService.experimentPublicName}</h1>
        <div>You've been invited to join this experiment. Please click the button below to begin.</div>
        <div class="action-buttons">
          <pr-button
            ?loading=${this.isLoading}
            @click=${this.joinExperiment}>
            Join experiment
          </pr-button>
        </div>
      </div>
    `;
  }

  private async joinExperiment() {
    this.isLoading = true;
    this.analyticsService.trackButtonClick(ButtonClick.PARTICIPANT_JOIN);

    const params = this.routerService.activeRoute.params;
    const isAnonymous = requiresAnonymousProfiles(
      this.experimentService.stages
    );
    const response = await createParticipantCallable(
      this.firebaseService.functions, {
        experimentId: params['experiment'],
        cohortId: params['cohort'],
        isAnonymous
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
