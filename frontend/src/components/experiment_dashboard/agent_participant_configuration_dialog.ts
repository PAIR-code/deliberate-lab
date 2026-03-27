import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../shared/agent_model_selector';

import '@material/web/textfield/filled-text-field.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';

import {
  AgentModelSettings,
  AgentPersonaConfig,
  CohortConfig,
  createAgentModelSettings,
  DEFAULT_AGENT_PARTICIPANT_ID,
} from '@deliberation-lab/utils';

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
  @property() agent: AgentPersonaConfig | undefined = undefined;
  @property({type: Object}) modelSettings: AgentModelSettings =
    createAgentModelSettings();

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
    this.modelSettings = createAgentModelSettings();
  }

  private renderEdit() {
    const handleSettingsChange = (e: CustomEvent<AgentModelSettings>) => {
      this.modelSettings = e.detail;
    };

    return html`
      <agent-model-selector
        .apiType=${this.modelSettings.apiType}
        .modelName=${this.modelSettings.modelName}
        @model-settings-change=${handleSettingsChange}
      ></agent-model-selector>
      ${this.renderPromptContext()}
      <div class="buttons-wrapper">
        <pr-button
          ?disabled=${!this.modelSettings.modelName}
          ?loading=${this.isLoading}
          @click=${() => {
            this.isLoading = true;
            this.analyticsService.trackButtonClick(
              ButtonClick.AGENT_PARTICIPANT_ADD,
            );
            if (this.cohort && this.modelSettings.modelName) {
              this.experimentEditor.addAgentParticipant();
              this.agentId = DEFAULT_AGENT_PARTICIPANT_ID;
              this.experimentManager.createAgentParticipant(this.cohort.id, {
                agentId: this.agentId,
                promptContext: this.promptContext,
                modelSettings: this.modelSettings,
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
