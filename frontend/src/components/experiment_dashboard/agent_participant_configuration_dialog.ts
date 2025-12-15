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

import {
  AgentPersonaConfig,
  CohortConfig,
  ApiKeyType,
  AgentPersonaType,
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
  @property() model: string = '';

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
      ${this.renderAgentModel()} ${this.renderPromptContext()}
      <div class="buttons-wrapper">
        <pr-button
          ?disabled=${this.model === ''}
          ?loading=${this.isLoading}
          @click=${() => {
            this.isLoading = true;
            this.analyticsService.trackButtonClick(
              ButtonClick.AGENT_PARTICIPANT_ADD,
            );
            if (this.cohort && this.model) {
              this.experimentEditor.addAgentParticipant();
              this.agentId = DEFAULT_AGENT_PARTICIPANT_ID;
              const modelSettings = createAgentModelSettings({
                apiType: ApiKeyType.GEMINI_API_KEY,
                modelName: this.model,
              });

              this.experimentManager.createAgentParticipant(this.cohort.id, {
                agentId: this.agentId,
                promptContext: this.promptContext,
                modelSettings,
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

  private renderAgentModel() {
    return html`
      <div class="selections">
        <div>Model to use for this specific agent participant:</div>
        <div class="model-selector">
          ${this.renderModelButton(
            'gemini-2.5-flash',
            'Gemini 2.5 Flash',
            ApiKeyType.GEMINI_API_KEY,
          )}
          ${this.renderModelButton(
            'gemini-2.5-pro',
            'Gemini 2.5 Pro',
            ApiKeyType.GEMINI_API_KEY,
          )}
        </div>
      </div>
    `;
  }

  private renderModelButton(
    modelId: string,
    modelName: string,
    apiType: ApiKeyType,
  ) {
    const updateModel = () => {
      this.model = modelId;
    };

    const isActive = modelId == this.model;
    return html`
      <pr-button
        color="${isActive ? 'primary' : 'neutral'}"
        variant=${isActive ? 'tonal' : 'default'}
        @click=${updateModel}
      >
        ${modelName}
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
