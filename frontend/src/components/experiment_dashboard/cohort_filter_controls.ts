import '../../pair-components/icon';
import '../../pair-components/menu';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';
import {ParticipantStatusFilter} from '../../shared/participant.utils';

import {styles} from './cohort_filter_controls.scss';

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
        icon=${this.getStatusFilterIcon()}
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
          ${this.renderFilterCheckbox('active', 'Active')}
          ${this.renderFilterCheckbox('inProgress', 'In Progress')}
          ${this.renderFilterCheckbox('completed', 'Completed')}
          ${this.renderFilterCheckbox('attentionCheck', 'Attention Check')}
          ${this.renderFilterCheckbox('booted', 'Booted')}
          ${this.renderFilterCheckbox('obsolete', 'Dropped')}
        </div>
      </pr-menu>
    `;
  }

  private renderSortMenu() {
    const sortBy = this.experimentManager.participantSortBy;
    const label = sortBy === 'lastActive' ? 'Last Active' : 'Name';

    return html`
      <pr-menu
        name=${label}
        icon="sort_by_alpha"
        color="secondary"
        variant="default"
        ?alignStart=${this.alignStart}
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

  private renderFilterCheckbox(filter: ParticipantStatusFilter, label: string) {
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
        <span>${label}</span>
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
      switch (filter) {
        case 'active':
          return 'Active';
        case 'inProgress':
          return 'In Progress';
        case 'completed':
          return 'Completed';
        case 'attentionCheck':
          return 'Attention';
        case 'booted':
          return 'Booted';
        case 'obsolete':
          return 'Dropped';
      }
    }
    return `${filters.size} filters`;
  }

  private getStatusFilterIcon() {
    return 'filter_list';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-filter-controls': CohortFilterControls;
  }
}
