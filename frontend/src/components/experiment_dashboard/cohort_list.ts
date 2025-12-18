import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/tooltip';

import './cohort_summary';

import '@material/web/checkbox/checkbox.js';

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
              icon=${hideLockedCohorts ? 'filter_list' : 'filter_list_off'}
            >
            </pr-icon>
            <div>
              ${hideLockedCohorts ? 'Show all cohorts' : 'Hide locked cohorts'}
            </div>
          </div>
          <div
            class="checkbox-wrapper"
            @click=${() => {
              this.experimentManager.setExpandAllCohorts(!expandAllCohorts);
            }}
          >
            <pr-icon
              color="secondary"
              size="small"
              variant="default"
              icon=${expandAllCohorts ? 'collapse_all' : 'expand_all'}
            >
            </pr-icon>
            <div>${expandAllCohorts ? 'Collapse' : 'Expand'} all cohorts</div>
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
              icon=${showMediators ? 'visibility_off' : 'visibility'}
            >
            </pr-icon>
            <div>${showMediators ? 'Hide' : 'Show'} mediators</div>
          </div>
          <div class="sort-controls">
            <pr-menu
              name=${this.experimentManager.participantSortBy === 'lastActive'
                ? 'Last Active'
                : 'Name'}
              icon=${this.experimentManager.participantSortBy === 'lastActive'
                ? 'hourglass_empty'
                : 'sort_by_alpha'}
              color="secondary"
              variant="default"
            >
              <div class="menu-wrapper">
                <div
                  class="menu-item"
                  @click=${() => {
                    this.experimentManager.setParticipantSortBy('lastActive');
                  }}
                >
                  Sort by Last Active
                </div>
                <div
                  class="menu-item"
                  @click=${() => {
                    this.experimentManager.setParticipantSortBy('name');
                  }}
                >
                  Sort by name
                </div>
              </div>
            </pr-menu>
          </div>
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
