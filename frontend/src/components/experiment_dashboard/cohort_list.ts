import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import './cohort_summary';
import './cohort_filter_controls';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
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
        ${this.renderHeader()} ${this.renderActions()} ${this.renderContent()}
      </div>
    `;
  }

  private renderActions() {
    const hideLockedCohorts = this.experimentManager.hideLockedCohorts;
    const expandAllCohorts = this.experimentManager.expandAllCohorts;
    const showMediators = this.experimentManager.showMediatorsInCohortSummary;

    return html`
      <div class="header">
        <div class="left">
          <pr-tooltip text="Expand/collapse all" position="BOTTOM_START">
            <pr-icon-button
              icon=${expandAllCohorts ? 'collapse_all' : 'expand_all'}
              color="secondary"
              size="small"
              variant="default"
              @click=${() => {
                this.experimentManager.setExpandAllCohorts(!expandAllCohorts);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setHideLockedCohorts(!hideLockedCohorts);
            }}
          >
            <pr-icon
              color="secondary"
              size="small"
              variant="default"
              icon=${hideLockedCohorts ? 'visibility_off' : 'visibility'}
            >
            </pr-icon>
            <div>
              ${hideLockedCohorts
                ? 'Show all cohorts'
                : 'Hide\u00A0locked cohorts'}
            </div>
          </div>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setShowMediatorsInCohortSummary(
                !showMediators,
              );
            }}
          >
            <pr-icon
              color="secondary"
              size="small"
              variant="default"
              icon=${showMediators ? 'person' : 'person_off'}
            >
            </pr-icon>
            <div>${showMediators ? 'Hide mediators' : 'Show mediators'}</div>
          </div>
        </div>
        <div class="right">
          <cohort-filter-controls></cohort-filter-controls>
        </div>
      </div>
    `;
  }

  private renderHeader() {
    const getCohortName = (offset: number) => {
      return this.experimentManager.getNextCohortName(offset);
    };

    return html`
      <div class="header">
        <div class="left">
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
                const name = getCohortName(0);
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
                [...Array(5).keys()].forEach((key) => {
                  this.analyticsService.trackButtonClick(
                    ButtonClick.COHORT_ADD,
                  );
                  const name = getCohortName(key);
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
                [...Array(10).keys()].forEach((key) => {
                  this.analyticsService.trackButtonClick(
                    ButtonClick.COHORT_ADD,
                  );
                  const name = getCohortName(key);
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
              html`<cohort-summary
                .cohort=${cohort}
                .isExpanded=${this.experimentManager.expandAllCohorts}
              >
              </cohort-summary>`,
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
