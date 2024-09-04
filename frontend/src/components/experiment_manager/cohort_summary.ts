import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import './participant_summary';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';

import {
  CohortConfig
} from '@deliberation-lab/utils';

import {styles} from './cohort_summary.scss';

/** Cohort summary for experimenters. */
@customElement('cohort-summary')
export class CohortSummary extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  @property() cohort: CohortConfig|undefined = undefined;
  @property() isExpanded = false;

  override render() {
    if (this.cohort === undefined) {
      return nothing;
    }

    return html`
      <div class="cohort-summary">
        ${this.renderHeader()}
        ${this.renderBody()}
      </div>
    `;
  }

  private getCohortName() {
    const name = this.cohort?.metadata.name;
    if (name) return name;
    return `Untitled cohort: ${this.cohort?.id.split('-')[0]}`;
  }

  private renderHeader() {
    return html`
      <div class="header">
        <div class="left">
          <pr-icon-button
            icon=${this.isExpanded ? "collapse_all" : "expand_all"}
            color="neutral"
            variant="default"
            @click=${() => { this.isExpanded = !this.isExpanded; }}
          >
          </pr-icon-button>
          <div>${this.getCohortName()}</div>
        </div>
        <div class="right">
          <pr-icon-button
            icon="person_add"
            color="tertiary"
            variant="default"
            ?loading=${this.experimentManager.isWritingParticipant}
            @click=${async () => {
              if (!this.cohort) return;
              await this.experimentManager.createParticipant(this.cohort.id);
              this.isExpanded = true;
            }}
          >
          </pr-icon-button>
          <pr-icon-button
            icon="settings"
            color="neutral"
            variant="default"
            @click=${() => {
              this.experimentManager.setCohortEditing(this.cohort);
            }}
          >
          </pr-icon-button>
      </div>
    `;
  }

  private renderBody() {
    if (!this.isExpanded || !this.cohort) {
      return nothing;
    }

    const participants = this.experimentManager.getCohortParticipants(
      this.cohort.id
    );

    if (participants.length === 0) {
      return html`
        <div class="empty-message">No participants yet.</div>
      `;
    }

    return html`
      <div class="body">
        ${participants.map(
          participant =>
          html`
            <participant-summary .participant=${participant}>
            </participant-summary>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cohort-summary': CohortSummary;
  }
}
