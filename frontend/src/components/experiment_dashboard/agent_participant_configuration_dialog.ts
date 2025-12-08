import '../../pair-components/button';
import '../../pair-components/icon_button';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/checkbox/checkbox.js';

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
  AgentChatSettings,
  createAgentModelSettings,
} from '@deliberation-lab/utils';

import {styles} from './agent_participant_configuration_dialog.scss';

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
  @property() apiType: ApiKeyType = ApiKeyType.GEMINI_API_KEY;
  @property() model: string = 'gemini-3-pro-preview';
  @property() useWebSearch: boolean = false;

  // Chat settings
  @property() wordsPerMinute: number | null = null;
  @property() minMessagesBeforeResponding: number = 0;
  @property() canSelfTriggerCalls: boolean = false;
  @property() maxResponses: number | null = 100;

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
    this.apiType = ApiKeyType.GEMINI_API_KEY;
    this.model = 'gemini-3-pro-preview';
    this.useWebSearch = false;
    // Reset chat settings
    this.wordsPerMinute = null;
    this.minMessagesBeforeResponding = 0;
    this.canSelfTriggerCalls = false;
    this.maxResponses = 100;
  }

  private renderEdit() {
    return html`
      <div class="section">
        <div class="section-title">Model settings</div>
        ${this.renderApiType()} ${this.renderModelId()}
        ${this.renderWebSearchOption()}
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">Prompt</div>
        ${this.renderPromptContext()}
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">Chat settings</div>
        <div class="description">
          Configure how this agent participates in chat stages.
        </div>
        ${this.renderChatSettings()}
      </div>
      <div class="buttons-wrapper">
        <pr-button
          ?disabled=${this.model === ''}
          ?loading=${this.isLoading}
          @click=${this.handleAddAgent}
        >
          Add agent participant
        </pr-button>
      </div>
    `;
  }

  private handleAddAgent() {
    this.isLoading = true;
    this.analyticsService.trackButtonClick(ButtonClick.AGENT_PARTICIPANT_ADD);
    if (this.cohort && this.model) {
      this.experimentEditor.addAgentParticipant();
      this.agentId = ''; // Make agent ID blank for agents added from cohort panel that use default prompts
      const modelSettings = createAgentModelSettings({
        apiType: this.apiType,
        modelName: this.model,
        useWebSearch: this.useWebSearch,
      });

      const chatSettings: AgentChatSettings = {
        initialMessage: '',
        wordsPerMinute: this.wordsPerMinute,
        minMessagesBeforeResponding: this.minMessagesBeforeResponding,
        canSelfTriggerCalls: this.canSelfTriggerCalls,
        maxResponses: this.maxResponses,
      };

      this.experimentManager.createAgentParticipant(this.cohort.id, {
        agentId: this.agentId,
        promptContext: this.promptContext,
        modelSettings,
        chatSettings,
      });
    }
    this.resetFields();
    this.isSuccess = true;
    this.isLoading = false;
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

  private renderApiType() {
    return html`
      <div class="field">
        <div class="field-title">LLM API</div>
        <div class="action-buttons">
          ${this.renderApiTypeButton('Gemini', ApiKeyType.GEMINI_API_KEY)}
          ${this.renderApiTypeButton('OpenAI', ApiKeyType.OPENAI_API_KEY)}
          ${this.renderApiTypeButton('Anthropic', ApiKeyType.CLAUDE_API_KEY)}
          ${this.renderApiTypeButton('Ollama', ApiKeyType.OLLAMA_CUSTOM_URL)}
        </div>
      </div>
    `;
  }

  private renderApiTypeButton(apiName: string, apiType: ApiKeyType) {
    const updateApiType = () => {
      this.apiType = apiType;
      // Set a default model name when switching API types
      if (apiType === ApiKeyType.GEMINI_API_KEY) {
        this.model = 'gemini-3-pro-preview';
      } else if (apiType === ApiKeyType.OPENAI_API_KEY) {
        this.model = 'gpt-5.1-2025-11-13';
      } else if (apiType === ApiKeyType.CLAUDE_API_KEY) {
        this.model = 'claude-opus-4-5-20251101';
      } else if (apiType === ApiKeyType.OLLAMA_CUSTOM_URL) {
        this.model = 'llama3.2';
      }
      // Reset web search when switching to OpenAI or Ollama (not supported)
      if (
        apiType === ApiKeyType.OLLAMA_CUSTOM_URL ||
        apiType === ApiKeyType.OPENAI_API_KEY
      ) {
        this.useWebSearch = false;
      }
    };

    const isActive = apiType === this.apiType;
    return html`
      <pr-button
        color="${isActive ? 'primary' : 'neutral'}"
        variant=${isActive ? 'tonal' : 'default'}
        @click=${updateApiType}
      >
        ${apiName}
      </pr-button>
    `;
  }

  private renderModelId() {
    const updateModel = (e: InputEvent) => {
      const content = (e.target as HTMLTextAreaElement).value;
      this.model = content;
    };

    return html`
      <div class="field">
        <md-filled-text-field
          ?disabled=${this.isLoading}
          label="Model ID"
          .value=${this.model}
          @input=${updateModel}
        >
        </md-filled-text-field>
      </div>
    `;
  }

  private renderWebSearchOption() {
    // Only show for Gemini and Anthropic (OpenAI and Ollama don't support web search in chat completions)
    if (
      this.apiType === ApiKeyType.OLLAMA_CUSTOM_URL ||
      this.apiType === ApiKeyType.OPENAI_API_KEY
    ) {
      return nothing;
    }

    const toggleWebSearch = (event: Event) => {
      const checked = (event.target as HTMLInputElement).checked;
      this.useWebSearch = checked;
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${this.useWebSearch}
          ?disabled=${this.isLoading}
          @change=${toggleWebSearch}
        >
        </md-checkbox>
        <div>Enable web search</div>
      </div>
    `;
  }

  private renderPromptContext() {
    const updatePromptContext = (e: InputEvent) => {
      const content = (e.target as HTMLTextAreaElement).value;
      this.promptContext = content;
    };

    return html`
      <div class="field">
        <md-filled-text-field
          ?disabled=${this.isLoading}
          type="textarea"
          label="Prompt context (optional)"
          .value=${this.promptContext}
          @input=${updatePromptContext}
        >
        </md-filled-text-field>
        <div class="description">
          Additional context to include in the agent's prompts.
        </div>
      </div>
    `;
  }

  private renderChatSettings() {
    return html`
      <div class="field">
        <label>Typing speed (words per minute)</label>
        <div class="description">
          Agent's typing speed. Leave empty for instant messages.
        </div>
        <div class="number-input">
          <input
            ?disabled=${this.isLoading}
            type="number"
            min="1"
            .value=${this.wordsPerMinute ?? ''}
            placeholder="Instant"
            @input=${(e: InputEvent) => {
              const value = (e.target as HTMLInputElement).value;
              this.wordsPerMinute = value === '' ? null : Number(value);
            }}
          />
        </div>
      </div>
      <div class="field">
        <label>Minimum messages before responding</label>
        <div class="description">
          Number of chat messages that must exist before the agent can respond.
        </div>
        <div class="number-input">
          <input
            ?disabled=${this.isLoading}
            type="number"
            min="0"
            .value=${this.minMessagesBeforeResponding}
            @input=${(e: InputEvent) => {
              const value = Number((e.target as HTMLInputElement).value);
              if (!isNaN(value)) {
                this.minMessagesBeforeResponding = value;
              }
            }}
          />
        </div>
      </div>
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${this.canSelfTriggerCalls}
          ?disabled=${this.isLoading}
          @change=${(e: Event) => {
            this.canSelfTriggerCalls = (e.target as HTMLInputElement).checked;
          }}
        >
        </md-checkbox>
        <div>
          Can respond multiple times in a row
          <span class="small">
            (Agent's own messages can trigger new responses)
          </span>
        </div>
      </div>
      <div class="field">
        <label>Maximum responses</label>
        <div class="description">
          Maximum total responses during the chat. Leave empty for no limit.
        </div>
        <div class="number-input">
          <input
            ?disabled=${this.isLoading}
            type="number"
            min="1"
            .value=${this.maxResponses ?? ''}
            placeholder="No limit"
            @input=${(e: InputEvent) => {
              const value = (e.target as HTMLInputElement).value;
              this.maxResponses = value === '' ? null : Number(value);
            }}
          />
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-participant-configuration-dialog': AgentParticipantDialog;
  }
}
