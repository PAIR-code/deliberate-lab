import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../shared/agent_model_selector';
import '../shared/persona_generation_buttons';

import '@material/web/textfield/filled-text-field.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Ref, createRef, ref} from 'lit/directives/ref.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
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
  private readonly authService = core.getService(AuthService);
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

  private readonly textFieldRef: Ref<HTMLElement> = createRef();

  private close() {
    this.dispatchEvent(new CustomEvent('close'));
  }

  private resetFields() {
    this.agentId = '';
    this.promptContext = '';
    this.modelSettings = createAgentModelSettings();
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
          ${this.isSuccess ? this.renderSuccess() : this.renderEditContent()}
        </div>
        ${this.isSuccess ? nothing : this.renderFooter()}
      </div>
    `;
  }

  private renderEditContent() {
    const handleSettingsChange = (e: CustomEvent<AgentModelSettings>) => {
      this.modelSettings = e.detail;
    };

    return html`
      <agent-model-selector
        .apiType=${this.modelSettings.apiType}
        .modelName=${this.modelSettings.modelName}
        .experimenterData=${this.authService.experimenterData}
        @model-settings-change=${handleSettingsChange}
      ></agent-model-selector>
      ${this.renderPromptContext()}
    `;
  }

  private renderFooter() {
    const handlePersonaTextChange = async (
      e: CustomEvent<{text: string; mode: string}>,
    ) => {
      const {text, mode} = e.detail;
      if (mode === 'generate' || mode === 'refresh') {
        // Generate (merge-expand) and Refresh both replace the full field
        this.promptContext = text;
      } else {
        // Enhance appends episodic memories to existing text
        const separator = this.promptContext.trim() ? '\n\n' : '';
        this.promptContext = this.promptContext + separator + text;

        // Scroll to bottom only for Enhance (text is appended)
        await this.updateComplete;
        const textField = this.textFieldRef.value;
        if (textField) {
          const textarea = textField.shadowRoot?.querySelector('textarea');
          if (textarea) {
            textarea.scrollTop = textarea.scrollHeight;
          }
        }
      }
    };

    return html`
      <div class="footer">
        <persona-generation-buttons
          .currentText=${this.promptContext}
          .modelSettings=${this.modelSettings}
          ?disabled=${this.isLoading}
          @persona-text-change=${handlePersonaTextChange}
        ></persona-generation-buttons>
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
        ${ref(this.textFieldRef)}
        ?disabled=${this.isLoading}
        type="textarea"
        rows=${Math.min(
          Math.max(
            3,
            (this.promptContext.match(/\n/g) ?? []).length + 1,
            Math.ceil(this.promptContext.length / 72),
          ),
          18,
        )}
        label="Add an optional persona prompt for this specific agent participant (e.g. You are ...)"
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
