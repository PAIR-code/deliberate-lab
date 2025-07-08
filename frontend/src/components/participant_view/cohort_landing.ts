import '../../pair-components/button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentService} from '../../services/experiment.service';
import {FirebaseService} from '../../services/firebase.service';
import {Pages, RouterService} from '../../services/router.service';
import {ExperimentManager} from '../../services/experiment.manager';

import {bootParticipantCallable} from '../../shared/callables';

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
  @state() showResumeDialog = false;
  @state() resumeParticipantId: string = '';

  override render() {
    const isLockedCohort = () => {
      const params = this.routerService.activeRoute.params;
      if (!this.experimentService.experiment) return false;
      if (this.experimentService.experiment.cohortLockMap[params['cohort']]) {
        return true;
      }
      return false;
    };

    const renderText = () => {
      if (isLockedCohort()) {
        return html`<div>This experiment is currently closed.</div>`;
      }
      return html`<div>
        You've been invited to join this experiment. Please click the button
        below to begin.
      </div>`;
    };

    return html`
      <div class="main">
        <h1>${this.experimentService.experimentPublicName}</h1>
        ${renderText()}
        <div class="action-buttons">
          <pr-button
            ?loading=${this.isLoading}
            ?disabled=${isLockedCohort() ||
            this.isLoading ||
            this.showResumeDialog}
            @click=${this.joinExperiment}
          >
            Join experiment
          </pr-button>
        </div>
        ${this.showResumeDialog
          ? html`<div class="resume-dialog">
              <div>
                A previous session was found for your Prolific ID.<br />
                Would you like to resume your previous session or start over?
              </div>
              <div class="resume-dialog-buttons">
                <pr-button @click=${this.handleResume}>Resume</pr-button>
                <pr-button
                  @click=${this.handleStartOver}
                  .loading=${this.isLoading}
                  >Start Over</pr-button
                >
              </div>
            </div>`
          : nothing}
      </div>
    `;
  }

  private async joinExperiment() {
    this.isLoading = true;
    this.analyticsService.trackButtonClick(ButtonClick.PARTICIPANT_JOIN);

    const params = this.routerService.activeRoute.params;

    const prolificIdMatch = window.location.href.match(
      /[?&]PROLIFIC_PID=([^&]+)/,
    );
    const prolificId = prolificIdMatch ? prolificIdMatch[1] : undefined;
    if (
      this.experimentService.experiment!.prolificConfig!
        .enableProlificIntegration &&
      !prolificIdMatch
    ) {
      console.warn(
        'Warning: Participant joining a Prolific experiment without a Prolific code.',
      );
    }

    // Use ExperimentManager's createParticipant
    const response = await core
      .getService(ExperimentManager)
      .createParticipant(params['cohort'], prolificId);

    if (response.exists && response.participant) {
      // Existing participant found, show dialog
      this.resumeParticipantId = response.participant.privateId || '';
      this.showResumeDialog = true;
      this.isLoading = false;
      return;
    }

    // New participant created
    this.routerService.navigate(Pages.PARTICIPANT, {
      experiment: params['experiment'],
      participant: response.id!,
    });
    this.isLoading = false;
  }

  private async handleResume() {
    // Resume with existing participant
    const params = this.routerService.activeRoute.params;
    this.routerService.navigate(Pages.PARTICIPANT, {
      experiment: params['experiment'],
      participant: this.resumeParticipantId!,
    });
    this.showResumeDialog = false;
  }

  private async handleStartOver() {
    // Boot old participant, then create new one
    this.isLoading = true;
    const params = this.routerService.activeRoute.params;
    await bootParticipantCallable(this.firebaseService.functions, {
      experimentId: params['experiment'],
      participantId: this.resumeParticipantId!,
    });
    // Create new participant (forceNew)
    const prolificIdMatch = window.location.href.match(
      /[?&]PROLIFIC_PID=([^&]+)/,
    );
    const prolificId = prolificIdMatch ? prolificIdMatch[1] : undefined;
    const response = await core.getService(ExperimentManager).createParticipant(
      params['cohort'],
      prolificId,
      true, // forceNew
    );
    this.routerService.navigate(Pages.PARTICIPANT, {
      experiment: params['experiment'],
      participant: response.participant
        ? response.participant.privateId!
        : response.id!,
    });
    this.isLoading = false;
    this.showResumeDialog = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-landing': CohortLanding;
  }
}
