import '../../pair-components/icon';
import '../../pair-components/menu';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {
  ParticipantSortOption,
  ParticipantStatusFilter,
} from '../../shared/participant.utils';

import {styles} from './cohort_filter_controls.scss';

/** Icon for the status filter menu. */
const STATUS_FILTER_ICON = 'filter_list';

/** Display labels for each participant status filter. */
const STATUS_FILTER_LABELS: Record<ParticipantStatusFilter, string> = {
  active: 'Active',
  inProgress: 'In Progress',
  completed: 'Completed',
  attentionCheck: 'Attention Check',
  booted: 'Booted',
  obsolete: 'Dropped',
};

/** Display labels for each participant sort option. */
const SORT_OPTION_LABELS: Record<ParticipantSortOption, string> = {
  lastActive: 'Last Active',
  name: 'Name',
  startTime: 'Start Time',
};

/** Shared filter and sort controls for cohort participant lists */
@customElement('cohort-filter-controls')
export class CohortFilterControls extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  /** When true, menu dropdowns align to the start (left) instead of end (right) */
  @property({type: Boolean}) alignStart = false;

  override render() {
    return html`
      ${this.renderStatusFilter()} ${this.renderSortMenu()}
      ${this.renderDirectionToggle()}
    `;
  }

  private renderStatusFilter() {
    return html`
      <pr-menu
        name=${this.getStatusFilterLabel()}
        icon=${STATUS_FILTER_ICON}
        color="secondary"
        variant="default"
        ?alignStart=${this.alignStart}
      >
        <div class="menu-wrapper">
          <div
            class="menu-item"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.experimentManager.clearParticipantStatusFilters();
            }}
          >
            Show all
          </div>
          <div class="menu-divider"></div>
          ${Object.keys(STATUS_FILTER_LABELS).map((filter) =>
            this.renderFilterCheckbox(filter as ParticipantStatusFilter),
          )}
        </div>
      </pr-menu>
    `;
  }

  private renderSortMenu() {
    const sortBy = this.experimentManager.participantSortBy;
    const label = SORT_OPTION_LABELS[sortBy];

    return html`
      <pr-menu
        name=${label}
        icon="sort_by_alpha"
        color="secondary"
        variant="default"
        ?alignStart=${this.alignStart}
      >
        <div class="menu-wrapper">
          ${(Object.keys(SORT_OPTION_LABELS) as ParticipantSortOption[]).map(
            (option) => html`
              <div
                class="menu-item"
                @click=${() => {
                  this.experimentManager.setParticipantSortBy(option);
                }}
              >
                Sort by ${SORT_OPTION_LABELS[option]}
              </div>
            `,
          )}
        </div>
      </pr-menu>
    `;
  }

  private renderDirectionToggle() {
    const isAsc = this.experimentManager.participantSortDirection === 'asc';
    return html`
      <pr-tooltip
        text=${isAsc
          ? 'Ascending (click to reverse)'
          : 'Descending (click to reverse)'}
        position="BOTTOM_END"
      >
        <div
          class="direction-toggle"
          @click=${() => {
            this.experimentManager.setParticipantSortDirection(
              isAsc ? 'desc' : 'asc',
            );
          }}
        >
          <pr-icon
            color="secondary"
            size="small"
            variant="default"
            icon=${isAsc ? 'arrow_upward' : 'arrow_downward'}
          >
          </pr-icon>
        </div>
      </pr-tooltip>
    `;
  }

  private renderFilterCheckbox(filter: ParticipantStatusFilter) {
    const isChecked =
      this.experimentManager.participantStatusFilters.has(filter);
    return html`
      <div
        class="menu-item checkbox-item"
        @click=${(e: Event) => {
          e.stopPropagation();
          this.experimentManager.toggleParticipantStatusFilter(filter);
        }}
      >
        <pr-icon
          icon=${isChecked ? 'check_box' : 'check_box_outline_blank'}
          size="small"
          color=${isChecked ? 'secondary' : 'neutral'}
        ></pr-icon>
        <span>${STATUS_FILTER_LABELS[filter]}</span>
      </div>
    `;
  }

  private getStatusFilterLabel() {
    const filters = this.experimentManager.participantStatusFilters;
    if (filters.size === 0) {
      return 'All';
    }
    if (filters.size === 1) {
      const filter = Array.from(filters)[0];
      // Use shorter label for 'attentionCheck' in the menu button
      if (filter === 'attentionCheck') {
        return 'Attention';
      }
      return STATUS_FILTER_LABELS[filter];
    }
    return `${filters.size} filters`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-filter-controls': CohortFilterControls;
  }
}
