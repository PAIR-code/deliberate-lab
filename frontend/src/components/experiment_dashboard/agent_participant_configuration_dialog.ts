import '../../pair-components/button';
import '../../pair-components/icon_button';
import '@material/web/textfield/filled-text-field.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentManager} from '../../services/experiment.manager';

import {AgentPersonaConfig, CohortConfig} from '@deliberation-lab/utils';

import {styles} from './cohort_settings_dialog.scss';

/** Agent participant configuration dialog */
@customElement('agent-participant-configuration-dialog')
export class AgentParticipantDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentManager = core.getService(ExperimentManager);

  @property() isLoading = false;
  @property() isSuccess = false;

  @property() cohort: CohortConfig | undefined = undefined;
  @property() onDialogClose = () => {};
  @property() agentId = '';
  @property() promptContext = '';

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
            @click=${this.onDialogClose}
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
                this.experimentManager.agentPersonaMap[this.agentId];
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
          <div class="subtitle">${persona.id}</div>
        </div>
      `;
    };
    return html`
      <div>
        <div>Persona to use for this specific agent participant</div>
        <div class="agent-persona-wrapper">
          ${this.experimentManager.agentParticipantPersonas.map((persona) =>
            renderAgentPersona(persona),
          )}
        </div>
        <div></div>
      </div>
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
