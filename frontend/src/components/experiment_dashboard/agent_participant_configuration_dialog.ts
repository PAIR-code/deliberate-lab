import '../../pair-components/button';
import '../../pair-components/icon_button';
import '@material/web/textfield/filled-text-field.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';

import {AgentPersonaConfig, CohortConfig} from '@deliberation-lab/utils';

import {styles} from './cohort_settings_dialog.scss';

/** Agent participant configuration dialog */
@customElement('agent-participant-configuration-dialog')
export class AgentParticipantDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() isLoading = false;
  @property() isSuccess = false;

  @property() cohort: CohortConfig | undefined = undefined;
  @property() agentId = '';
  @property() promptContext = '';

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  override render() {
    if (!this.cohort) {
      return nothing;
    }

    return html`
      <div class="dialog">
        <div class="header">
          <div>Add agent participant to ${this.cohort?.metadata.name}</div>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${this.close}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          ${this.isSuccess ? this.renderSuccess() : this.renderEdit()}
        </div>
      </div>
    `;
  }

  private resetFields() {
    this.agentId = '';
    this.promptContext = '';
  }

  private renderEdit() {
    return html`
      ${this.renderAgentPersona()} ${this.renderPromptContext()}
      <div class="buttons-wrapper">
        <pr-button
          ?disabled=${this.agentId === ''}
          ?loading=${this.isLoading}
          @click=${() => {
            this.isLoading = true;
            this.analyticsService.trackButtonClick(
              ButtonClick.AGENT_PARTICIPANT_ADD,
            );
            if (this.cohort && this.agentId) {
              const agent =
                this.experimentManager.agentPersonaMap[this.agentId] ??
                this.experimentEditor.getAgentParticipant(this.agentId)
                  ?.persona;
              this.experimentManager.createAgentParticipant(this.cohort.id, {
                agentId: this.agentId,
                promptContext: this.promptContext,
                modelSettings: agent.defaultModelSettings,
              });
            }
            this.resetFields();
            this.isSuccess = true;
            this.isLoading = false;
          }}
        >
          Add agent participant
        </pr-button>
      </div>
    `;
  }

  private renderSuccess() {
    return html`
      <div>Agent participant added!</div>
      <pr-button
        color="secondary"
        variant="outlined"
        @click=${() => {
          this.isSuccess = false;
        }}
      >
        Add another agent
      </pr-button>
    `;
  }

  private renderAgentPersona() {
    const renderAgentPersona = (persona: AgentPersonaConfig) => {
      const isCurrent = this.agentId === persona.id;
      return html`
        <div
          class="agent-persona ${isCurrent ? 'selected' : ''}"
          @click=${() => {
            if (this.isLoading) return;
            this.agentId = persona.id;
          }}
        >
          <div>${persona.name ?? 'Untitled'}</div>
          <div class="subtitle">${persona.defaultModelSettings.modelName}</div>
          <div class="subtitle">${persona.id}</div>
        </div>
      `;
    };

    const renderEmptyMessage = () => {
      if (
        this.experimentManager.agentParticipantPersonas.length +
          this.experimentEditor.agentParticipants.length >
        0
      ) {
        return nothing;
      }
      return html`
        <div class="error">
          No agent personas have been configured. Please add a new agent
          persona.
        </div>
      `;
    };

    return html`
      <div>
        <div class="persona-selector">
          <div>Persona to use for this specific agent participant</div>
          <div>${this.renderNewPersonaButton()}</div>
        </div>
        <div class="agent-persona-wrapper">
          ${renderEmptyMessage()}
          ${this.experimentManager.agentParticipantPersonas.map((persona) =>
            renderAgentPersona(persona),
          )}
          ${this.experimentEditor.agentParticipants.map((agent) =>
            renderAgentPersona(agent.persona),
          )}
        </div>
        <div></div>
      </div>
    `;
  }

  renderNewPersonaButton() {
    return html`
      <pr-button
        icon="person_add"
        color="tertiary"
        variant="tonal"
        @click=${() => {
          this.experimentEditor.addAgentParticipant();
          this.agentId = this.experimentEditor.currentAgent?.persona.id ?? '';
        }}
      >
        + New agent participant persona
      </pr-button>
    `;
  }

  private renderPromptContext() {
    const updatePromptContext = (e: InputEvent) => {
      const content = (e.target as HTMLTextAreaElement).value;
      this.promptContext = content;
    };

    return html`
      <md-filled-text-field
        ?disabled=${this.isLoading}
        type="textarea"
        label="Prompt context for this specific agent participant (optional)"
        .value=${this.promptContext}
        @input=${updatePromptContext}
      >
      </md-filled-text-field>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-participant-configuration-dialog': AgentParticipantDialog;
  }
}
