import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../shared/agent_model_selector';
import '../shared/persona_generation_buttons';

import {generatePersonaContextCallable} from '../../shared/callables';

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
import {FirebaseService} from '../../services/firebase.service';

import {
  AgentModelSettings,
  AgentPersonaConfig,
  CohortConfig,
  ModelResponseStatus,
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
  private readonly firebaseService = core.getService(FirebaseService);

  @property() isLoading = false;
  @property() isSuccess = false;
  @property() isQuickAdding = false;

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
    // Note: modelSettings intentionally preserved so Quick add can reuse it.
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

  private async quickAdd() {
    if (!this.cohort || !this.modelSettings.modelName) return;
    this.isQuickAdding = true;
    try {
      const creatorId = this.authService.experimenterData?.email ?? '';
      const response = await generatePersonaContextCallable(
        this.firebaseService.functions,
        {
          creatorId,
          mode: 'generate',
          currentText: '',
          apiType: this.modelSettings.apiType,
          modelName: this.modelSettings.modelName,
        },
      );
      const text =
        (response.status === ModelResponseStatus.OK ||
          response.status === ModelResponseStatus.LENGTH_ERROR) &&
        response.text
          ? response.text
          : '';
      this.experimentEditor.addAgentParticipant();
      this.experimentManager.createAgentParticipant(this.cohort.id, {
        agentId: DEFAULT_AGENT_PARTICIPANT_ID,
        promptContext: text,
        modelSettings: this.modelSettings,
      });
      this.analyticsService.trackButtonClick(ButtonClick.AGENT_PARTICIPANT_ADD);
    } finally {
      this.isQuickAdding = false;
    }
  }

  private renderSuccess() {
    return html`
      <div>Agent participant added!</div>
      <div class="button-row">
        <pr-button
          color="secondary"
          variant="outlined"
          ?disabled=${this.isQuickAdding}
          @click=${() => {
            this.isSuccess = false;
          }}
        >
          Add another agent
        </pr-button>
        <pr-button
          color="primary"
          variant="tonal"
          ?loading=${this.isQuickAdding}
          ?disabled=${!this.modelSettings.modelName || this.isQuickAdding}
          @click=${this.quickAdd}
        >
          ⚡ Quick add
        </pr-button>
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
