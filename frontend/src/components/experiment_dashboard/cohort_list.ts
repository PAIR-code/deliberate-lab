import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import './cohort_summary';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {StageConfig} from '@deliberation-lab/utils';
import {ExperimentManager} from '../../services/experiment.manager';

import {styles} from './cohort_list.scss';

/** Cohort accordions for experiment dashboard */
@customElement('cohort-list')
export class Component extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    return html`
      <div class="experiment-manager">
        ${this.renderHeader()} ${this.renderContent()}
      </div>
    `;
  }

  private renderHeader() {
    const getCohortName = (length: number) => {
      return `Cohort ${String(length).padStart(2, '0')}`;
    };

    return html`
      <div class="header">
        <div class="left">
          <pr-tooltip text="Hide panel" position="RIGHT">
            <pr-icon-button
              icon="visibility_off"
              size="small"
              color="neutral"
              variant="default"
              @click=${() => {
                this.experimentManager.setShowCohortList(false);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <div>${this.experimentManager.numCohorts} cohorts</div>
          <small>
            (${this.experimentManager.getNumExperimentParticipants(false)}
            participants)
          </small>
        </div>
        <div class="right">
          <pr-tooltip text="Add 1 cohort" position="BOTTOM_END">
            <pr-button
              color="secondary"
              variant="tonal"
              ?loading=${this.experimentManager.isWritingCohort}
              @click=${() => {
                this.analyticsService.trackButtonClick(ButtonClick.COHORT_ADD);
                const name = getCohortName(
                  this.experimentManager.cohortList.length,
                );
                this.experimentManager.createCohort({}, name);
              }}
            >
              Add cohort
            </pr-button>
          </pr-tooltip>
          <pr-tooltip text="Add 5 cohorts" position="BOTTOM_END">
            <pr-button
              color="secondary"
              variant="tonal"
              ?loading=${this.experimentManager.isWritingCohort}
              @click=${() => {
                const numCohorts = this.experimentManager.cohortList.length;
                [...Array(5).keys()].forEach((key) => {
                  this.analyticsService.trackButtonClick(
                    ButtonClick.COHORT_ADD,
                  );
                  const name = getCohortName(numCohorts + key);
                  this.experimentManager.createCohort({}, name);
                });
              }}
            >
              +5
            </pr-button>
          </pr-tooltip>
          <pr-tooltip text="Add 10 cohorts" position="BOTTOM_END">
            <pr-button
              color="secondary"
              variant="tonal"
              ?loading=${this.experimentManager.isWritingCohort}
              @click=${() => {
                const numCohorts = this.experimentManager.cohortList.length;
                [...Array(10).keys()].forEach((key) => {
                  this.analyticsService.trackButtonClick(
                    ButtonClick.COHORT_ADD,
                  );
                  const name = getCohortName(numCohorts + key);
                  this.experimentManager.createCohort({}, name);
                });
              }}
            >
              +10
            </pr-button>
          </pr-tooltip>
        </div>
      </div>
    `;
  }

  private renderContent() {
    if (this.experimentManager.cohortList.length === 0) {
      return html`
        <div class="empty-message">
          <div>
            To run your experiment, create a cohort and share the link with
            participants.
          </div>
          <div>
            Note that participants can only interact (group chats, elections)
            with participants in the same cohort.
          </div>
        </div>
      `;
    }

    return html`
      <div class="content">
        ${this.experimentManager.cohortList
          .slice()
          .sort((a, b) => {
            const nameComparison = a.metadata.name.localeCompare(
              b.metadata.name,
            );
            if (
              a.metadata.name.startsWith('Cohort') &&
              b.metadata.name.startsWith('Cohort')
            ) {
              return nameComparison;
            }
            return a.id.localeCompare(b.id);
          })
          .map(
            (cohort) =>
              html`<cohort-summary .cohort=${cohort}></cohort-summary>`,
          )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-list': Component;
  }
}
