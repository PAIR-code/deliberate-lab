import '../../pair-components/button';
import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentManager} from '../../services/experiment.manager';

import {AgentPersonaConfig, CohortConfig} from '@deliberation-lab/utils';

import {styles} from './cohort_settings_dialog.scss';

/** Agent mediator configuration dialog */
@customElement('agent-mediator-add-dialog')
export class AgentMediatorAddDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);

  @property() cohort: CohortConfig | undefined = undefined;

  @state() private selectedAgentId = '';
  @state() private isLoading = false;
  @state() private isSuccess = false;
  @state() private errorMessage = '';

  private close() {
    this.resetState();
    this.dispatchEvent(new CustomEvent('close'));
  }

  private resetState() {
    this.selectedAgentId = '';
    this.errorMessage = '';
    this.isLoading = false;
    this.isSuccess = false;
  }

  override render() {
    if (!this.cohort) {
      return nothing;
    }

    const cohortName =
      this.cohort.metadata.name.length > 0
        ? this.cohort.metadata.name
        : 'this cohort';

    return html`
      <div class="dialog">
        <div class="header">
          <div>Add agent mediator to ${cohortName}</div>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${this.close}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          ${this.isSuccess ? this.renderSuccess() : this.renderForm()}
        </div>
      </div>
    `;
  }

  private renderForm() {
    const personas = this.cohort
      ? this.experimentManager.getAvailableMediatorPersonas(this.cohort.id)
      : [];

    if (personas.length === 0) {
      return html`
        <div class="error">
          No mediator personas are available to add. Create a mediator persona
          in the experiment editor or remove an existing mediator from this
          cohort.
        </div>
        <div class="buttons-wrapper">
          <pr-button variant="tonal" @click=${this.close}>Close</pr-button>
        </div>
      `;
    }

    return html`
      ${this.renderPersonaList(personas)}
      ${this.errorMessage
        ? html`<div class="error">${this.errorMessage}</div>`
        : nothing}
      <div class="buttons-wrapper">
        <pr-button
          ?disabled=${this.selectedAgentId === ''}
          ?loading=${this.isLoading}
          @click=${this.addMediator}
        >
          Add mediator
        </pr-button>
      </div>
    `;
  }

  private renderSuccess() {
    return html`
      <div>Mediator added!</div>
      <div class="buttons-wrapper">
        <pr-button
          color="secondary"
          variant="outlined"
          @click=${() => {
            this.isSuccess = false;
            this.selectedAgentId = '';
            this.errorMessage = '';
          }}
        >
          Add another mediator
        </pr-button>
        <pr-button @click=${this.close}>Done</pr-button>
      </div>
    `;
  }

  private renderPersonaList(personas: AgentPersonaConfig[]) {
    const renderPersona = (persona: AgentPersonaConfig) => {
      const isSelected = this.selectedAgentId === persona.id;
      return html`
        <div
          class="agent-persona ${isSelected ? 'selected' : ''}"
          @click=${() => {
            if (this.isLoading) return;
            this.selectedAgentId = persona.id;
            this.errorMessage = '';
          }}
        >
          <div>${persona.name ?? 'Untitled'}</div>
          <div class="subtitle">${persona.id}</div>
        </div>
      `;
    };

    return html`
      <div>
        <div>Choose a mediator persona to add to this cohort</div>
        <div class="agent-persona-wrapper">
          ${personas.map((persona) => renderPersona(persona))}
        </div>
      </div>
    `;
  }

  private async addMediator() {
    if (!this.cohort || !this.selectedAgentId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.analyticsService.trackButtonClick(ButtonClick.AGENT_MEDIATOR_ADD);
      await this.experimentManager.createMediator(
        this.cohort.id,
        this.selectedAgentId,
      );
      this.selectedAgentId = '';
      this.isSuccess = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add mediator.';
      this.errorMessage = message;
    } finally {
      this.isLoading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-mediator-add-dialog': AgentMediatorAddDialog;
  }
}
