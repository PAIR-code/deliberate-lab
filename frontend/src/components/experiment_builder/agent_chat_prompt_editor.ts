import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import '@material/web/checkbox/checkbox.js';

import './structured_prompt_editor';
import {renderShuffleIndicator} from './structured_prompt_editor';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  AgentPersonaConfig,
  AgentPersonaType,
  ApiKeyType,
  BaseAgentPromptConfig,
  ChatMediatorStructuredOutputConfig,
  ChatPromptConfig,
  PromptItem,
  PromptItemGroup,
  PromptItemType,
  ReasoningLevel,
  StageConfig,
  StageKind,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputSchema,
  createDefaultPromptFromText,
  isAlwaysThinkingModel,
  isJsonSchemaUnsupportedModel,
  makeStructuredOutputPrompt,
  structuredOutputEnabled,
  TextPromptItem,
} from '@deliberation-lab/utils';
import {LLM_AGENT_AVATARS} from '../../shared/constants';
import {getHashBasedColor} from '../../shared/utils';

import {styles} from './agent_chat_prompt_editor.scss';
import {styles as dialogStyles} from './stage_builder_dialog.scss';

/** Editor for configuring agent chat prompt. */
@customElement('agent-chat-prompt-editor')
export class EditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() agent: AgentPersonaConfig | undefined = undefined;
  @property() stageNamePrefix = ''; // e.g., number of stage to show before name
  @property() stageId = '';

  @state() showDialog = false;
  @state() isTestButtonLoading = false;

  override render() {
    if (!this.agent) {
      return nothing;
    }

    const stageConfig = this.experimentEditor.getStage(this.stageId);
    if (!stageConfig) {
      return nothing;
    } else if (
      stageConfig.kind !== StageKind.CHAT &&
      stageConfig.kind !== StageKind.PRIVATE_CHAT
    ) {
      return html`
        <div class="section">
          <div class="inactive-stage">
            <div class="section-title inactive">
              ${this.stageNamePrefix}${stageConfig.name}
            </div>
            <div class="description">
              ${this.agent.type === AgentPersonaType.PARTICIPANT
                ? 'No prompt customizations currently available for this stage.'
                : 'Agent mediators do not interact with this stage.'}
            </div>
          </div>
        </div>
      `;
    }

    const promptConfig = this.getPrompt();

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">
            ${this.stageNamePrefix}${stageConfig.name}
          </div>
          ${promptConfig ? this.renderDialogButton() : nothing}
        </div>
        ${this.renderStructuredOutputWarning(this.agent)}
        ${promptConfig?.type === StageKind.CHAT ||
        promptConfig?.type === StageKind.PRIVATE_CHAT
          ? html`
              ${this.renderAgentPrompt(this.agent, promptConfig)}
              ${this.renderDialog(stageConfig, promptConfig)}
            `
          : this.renderAddButton()}
      </div>
    `;
  }

  private renderStructuredOutputWarning(agent: AgentPersonaConfig) {
    const modelName = agent.defaultModelSettings.modelName;

    // Get the prompt config and check if it's a chat config with structuredOutputConfig
    const promptConfig = this.getPrompt();
    const structuredOutputConfig =
      promptConfig &&
      'structuredOutputConfig' in promptConfig &&
      promptConfig.structuredOutputConfig;
    const usesJsonSchema =
      structuredOutputConfig &&
      structuredOutputConfig.type === StructuredOutputType.JSON_SCHEMA;

    // Only warn if using JSON_SCHEMA mode with a model that doesn't support it
    if (isJsonSchemaUnsupportedModel(modelName) && usesJsonSchema) {
      return html`
        <div class="warning">
          Warning: This model does not support native JSON Schema mode. Switch
          to JSON Format mode for structured output.
        </div>
      `;
    }
    return nothing;
  }

  private renderAddButton() {
    return html`
      <pr-button color="error" variant="tonal" @click=${this.addPrompt}>
        Add prompt
      </pr-button>
    `;
  }

  private addPrompt() {
    if (!this.agent) {
      return;
    } else if (this.agent.type === AgentPersonaType.MEDIATOR) {
      this.experimentEditor.addAgentMediatorPrompt(this.agent.id, this.stageId);
    } else if (this.agent.type === AgentPersonaType.PARTICIPANT) {
      this.experimentEditor.addAgentParticipantPrompt(
        this.agent.id,
        this.stageId,
      );
    }
  }

  private getPrompt() {
    return this.experimentEditor.getAgent(this.agent?.id ?? '')?.promptMap[
      this.stageId
    ];
  }

  private deletePrompt() {
    if (!this.agent) {
      return;
    } else if (this.agent.type === AgentPersonaType.MEDIATOR) {
      this.experimentEditor.deleteAgentMediatorPrompt(
        this.agent.id,
        this.stageId,
      );
    } else if (this.agent.type === AgentPersonaType.PARTICIPANT) {
      this.experimentEditor.deleteAgentParticipantPrompt(
        this.agent.id,
        this.stageId,
      );
    }
  }

  private updatePrompt(updatedPrompt: Partial<ChatPromptConfig>) {
    const oldPrompt = this.getPrompt();
    if (
      !this.agent ||
      !oldPrompt ||
      (oldPrompt.type !== StageKind.CHAT &&
        oldPrompt.type !== StageKind.PRIVATE_CHAT)
    ) {
      return;
    }

    const newPrompt = {...oldPrompt, ...updatedPrompt};
    if (this.agent.type === AgentPersonaType.MEDIATOR) {
      this.experimentEditor.updateAgentMediatorPrompt(this.agent.id, newPrompt);
    } else if (this.agent.type === AgentPersonaType.PARTICIPANT) {
      this.experimentEditor.updateAgentParticipantPrompt(
        this.agent.id,
        newPrompt,
      );
    }
  }

  private renderDialog(
    stageConfig: StageConfig,
    promptConfig: ChatPromptConfig,
  ) {
    if (!this.agent || !this.showDialog) return nothing;

    return html`
      <agent-chat-prompt-dialog
        .onClose=${() => {
          this.showDialog = false;
        }}
      >
        <div slot="title">${this.stageNamePrefix}${stageConfig.name}</div>
        <div class="section">
          ${this.renderAgentPrompt(this.agent, promptConfig)}
          <div class="section-title">Prompt settings</div>
          ${this.renderAgentStructuredOutputConfig(this.agent, promptConfig)}
          ${this.renderPromptPreview(promptConfig)}
        </div>
        <div class="divider"></div>
        ${this.renderAgentChatSettings(this.agent, promptConfig)}
        <div class="divider"></div>
        ${this.renderModelReasoningParameters(this.agent, promptConfig)}
        <div class="divider"></div>
        ${this.renderAgentSamplingParameters(this.agent, promptConfig)}
        <div class="divider"></div>
        ${this.renderAgentCustomRequestBodyFields(this.agent, promptConfig)}
        <div class="divider"></div>
        <pr-button color="error" variant="outlined" @click=${this.deletePrompt}>
          Delete prompt
        </pr-button>
      </agent-chat-prompt-dialog>
    `;
  }

  private renderDialogButton() {
    return html`
      <pr-button
        variant="default"
        color="neutral"
        @click=${() => {
          this.showDialog = true;
        }}
      >
        <div class="button-wrapper">
          <pr-icon icon="settings" variant="default" color="neutral"> </pr-icon>
          <div>Advanced settings</div>
        </div>
      </pr-button>
    `;
  }

  private renderAgentPrompt(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const updatePrompt = (prompt: PromptItem[]) => {
      this.updatePrompt({prompt});
    };

    return html`
      <structured-prompt-editor
        .prompt=${agentPromptConfig.prompt}
        .stageId=${this.stageId}
        .onUpdate=${updatePrompt}
      ></structured-prompt-editor>
    `;
  }

  private renderPromptPreview(agentPromptConfig: ChatPromptConfig) {
    // TODO: Render prompt preview with fake data populating prompt item
    // variables
    const renderPromptItem = (item: PromptItem): unknown => {
      switch (item.type) {
        case PromptItemType.TEXT:
          const textItem = item as TextPromptItem;
          return html`<div>${textItem.text}</div>`;
        case PromptItemType.GROUP:
          const group = item as PromptItemGroup;
          // prettier-ignore
          return html`<details class="prompt-group-preview" open><summary class="chip tertiary">GROUP: ${group.title} ${renderShuffleIndicator(group.shuffleConfig)}</summary><div class="chip-collapsible">${group.items.map((subItem: PromptItem) => renderPromptItem(subItem))}</div></details>`;
        default:
          return html`<div class="chip tertiary">${item.type}</div>`;
      }
    };

    const getPromptItems = () => {
      return agentPromptConfig.prompt.map((item) => renderPromptItem(item));
    };

    const getStructuredOutput = () => {
      const config = agentPromptConfig.structuredOutputConfig;
      if (structuredOutputEnabled(config) && config.schema) {
        return makeStructuredOutputPrompt(config);
      }
      return '';
    };

    return html`
      <div class="code-wrapper">
        <div class="field-title">Prompt preview</div>
        <pre><code>${getPromptItems()}${getStructuredOutput()}</code></pre>
      </div>
    `;
  }

  private renderAgentChatSettings(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const chatSettings = agentPromptConfig.chatSettings;

    const updateInitialMessage = (e: InputEvent) => {
      const initialMessage = (e.target as HTMLTextAreaElement).value;
      this.updatePrompt({
        chatSettings: {
          ...agentPromptConfig.chatSettings,
          initialMessage,
        },
      });
    };

    const updateWordsPerMinute = (e: InputEvent) => {
      const value = (e.target as HTMLInputElement).value;
      const wordsPerMinute = value === '' ? null : Number(value);
      this.updatePrompt({
        chatSettings: {
          ...agentPromptConfig.chatSettings,
          wordsPerMinute,
        },
      });
    };

    const updateMinMessagesBeforeResponding = (e: InputEvent) => {
      const minMessagesBeforeResponding = Number(
        (e.target as HTMLInputElement).value,
      );
      if (!isNaN(minMessagesBeforeResponding)) {
        this.updatePrompt({
          chatSettings: {
            ...agentPromptConfig.chatSettings,
            minMessagesBeforeResponding,
          },
        });
      }
    };

    const updateCanSelfTriggerCalls = (e: Event) => {
      const canSelfTriggerCalls = (e.target as HTMLInputElement).checked;
      this.updatePrompt({
        chatSettings: {
          ...agentPromptConfig.chatSettings,
          canSelfTriggerCalls,
        },
      });
    };

    const updateMaxResponses = (e: InputEvent) => {
      const value = (e.target as HTMLInputElement).value;
      const maxResponses = value === '' ? null : Number(value);
      this.updatePrompt({
        chatSettings: {
          ...agentPromptConfig.chatSettings,
          maxResponses,
        },
      });
    };

    const updateNumRetries = (e: InputEvent) => {
      const value = Number((e.target as HTMLInputElement).value);
      if (!isNaN(value) && value >= 0 && value <= 5) {
        this.updatePrompt({
          numRetries: value,
        });
      }
    };

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Chat settings</div>
          <div class="description">
            Configure how this agent participates in the chat.
          </div>
        </div>
        <div class="field">
          <label for="initialMessage">Initial message</label>
          <div class="description">
            Message sent automatically when the conversation begins.
          </div>
          <pr-textarea
            variant="outlined"
            placeholder="e.g., Hello! I'm here to help you with..."
            .value=${chatSettings.initialMessage}
            ?disabled=${!this.experimentEditor.isCreator}
            @input=${updateInitialMessage}
          >
          </pr-textarea>
        </div>
        <div class="field">
          <label for="wordsPerMinute">Typing speed (words per minute)</label>
          <div class="description">
            Agent's typing speed. Leave empty for instant messages.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="1"
              .value=${chatSettings.wordsPerMinute ?? ''}
              placeholder="Instant"
              @input=${updateWordsPerMinute}
            />
          </div>
        </div>
        <div class="field">
          <label for="minMessagesBeforeResponding"
            >Minimum messages before responding</label
          >
          <div class="description">
            Number of chat messages that must exist before the agent can
            respond.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="0"
              .value=${chatSettings.minMessagesBeforeResponding}
              @input=${updateMinMessagesBeforeResponding}
            />
          </div>
        </div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${chatSettings.canSelfTriggerCalls}
            ?disabled=${!this.experimentEditor.isCreator}
            @change=${updateCanSelfTriggerCalls}
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
          <label for="maxResponses">Maximum responses</label>
          <div class="description">
            Maximum total responses during the chat. Leave empty for no limit.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="1"
              .value=${chatSettings.maxResponses ?? ''}
              placeholder="No limit"
              @input=${updateMaxResponses}
            />
          </div>
        </div>
        <div class="field">
          <label for="numRetries">API retry attempts</label>
          <div class="description">
            Number of times to retry API calls if they fail with 500 errors.
            Uses exponential backoff.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="0"
              max="5"
              .value=${agentPromptConfig.numRetries ?? 0}
              placeholder="0"
              @input=${updateNumRetries}
            />
          </div>
        </div>
      </div>
    `;
  }

  private renderModelReasoningParameters(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const modelGenerationConfig = agentPromptConfig.generationConfig;

    const updateReasoningLevel = (e: Event) => {
      const value = (e.target as HTMLSelectElement).value;
      const reasoningLevel =
        value === '' ? undefined : (value as ReasoningLevel);
      this.updatePrompt({
        generationConfig: {
          ...agentPromptConfig.generationConfig,
          reasoningLevel,
        },
      });
    };

    const updateReasoningBudget = (e: InputEvent) => {
      const reasoningBudget = Number((e.target as HTMLInputElement).value);
      if (!isNaN(reasoningBudget)) {
        this.updatePrompt({
          generationConfig: {
            ...agentPromptConfig.generationConfig,
            reasoningBudget,
          },
        });
      }
    };

    const updateIncludeReasoning = (e: InputEvent) => {
      const includeReasoning = (e.target as HTMLInputElement).checked;
      this.updatePrompt({
        generationConfig: {
          ...agentPromptConfig.generationConfig,
          includeReasoning,
        },
      });
    };

    // TODO(rasmi): Extract reasoning level selector
    // and other shared parameters into a component
    // that refreshes options based on provider and
    // displays ProviderOptions appropriately.
    // See https://ai.google.dev/gemini-api/docs/thinking
    const reasoningLevelOptions: {value: ReasoningLevel | ''; label: string}[] =
      [
        {value: '', label: 'Default'},
        {value: 'off', label: 'Off'},
        {value: 'minimal', label: 'Minimal (Gemini 3 Flash only)'},
        {value: 'low', label: 'Low'},
        {value: 'medium', label: 'Medium'},
        {value: 'high', label: 'High'},
      ];

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Model Reasoning Parameters</div>
          <div class="description">
            Controls reasoning/thinking for supported models.
            <a
              href="https://ai.google.dev/gemini-api/docs/thinking"
              target="_blank"
              >Gemini</a
            >
            |
            <a
              href="https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking"
              target="_blank"
              >Claude</a
            >
          </div>
        </div>

        <div class="field">
          <label for="reasoning-level">Reasoning Level</label>
          <div class="description">
            Gemini 3: thinkingLevel. Claude: effort (token efficiency). OpenAI:
            reasoningEffort.
          </div>
          <select
            id="reasoning-level"
            @change=${updateReasoningLevel}
            ?disabled=${!this.experimentEditor.isCreator}
          >
            ${reasoningLevelOptions.map(
              (option) => html`
                <option
                  value=${option.value}
                  ?selected=${modelGenerationConfig.reasoningLevel ===
                    option.value ||
                  (option.value === '' &&
                    !modelGenerationConfig.reasoningLevel)}
                >
                  ${option.label}
                </option>
              `,
            )}
          </select>
        </div>

        <div class="field">
          <label for="reasoning-budget">Reasoning Budget</label>
          <div class="description">
            Max thinking tokens. Gemini 2.5: thinkingBudget (-1 = dynamic, 0 =
            off). Claude: budgetTokens.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              .value=${modelGenerationConfig.reasoningBudget}
              @input=${updateReasoningBudget}
            />
          </div>
        </div>

        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${this.getIncludeReasoningValue(
              modelGenerationConfig,
              agent.defaultModelSettings.modelName,
            )}
            ?disabled=${!this.experimentEditor.isCreator}
            @change=${updateIncludeReasoning}
          >
          </md-checkbox>
          <div>
            Include model reasoning in response
            <span class="small"
              >(auto-enabled for always-thinking models and when thinking is
              configured)</span
            >
          </div>
        </div>
      </div>
    `;
  }

  /** Returns effective includeReasoning value - true by default for always-thinking models or when thinking is configured */
  private getIncludeReasoningValue(
    config: {
      includeReasoning?: boolean;
      reasoningLevel?: ReasoningLevel;
      reasoningBudget?: number;
    },
    modelName?: string,
  ): boolean {
    // If explicitly set, use that value
    if (config.includeReasoning !== undefined) {
      return config.includeReasoning;
    }
    // Some models (e.g., Gemini 3) are always thinking.
    if (isAlwaysThinkingModel(modelName)) {
      return true;
    }
    // Default to true if thinking is configured
    const hasReasoningLevel =
      config.reasoningLevel !== undefined && config.reasoningLevel !== 'off';
    const hasValidBudget =
      typeof config.reasoningBudget === 'number' && config.reasoningBudget > 0;
    return hasReasoningLevel || hasValidBudget;
  }

  private renderAgentSamplingParameters(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const generationConfig = agentPromptConfig.generationConfig;

    const updateTemperature = (e: InputEvent) => {
      const temperature = Number((e.target as HTMLInputElement).value);
      if (!isNaN(temperature)) {
        this.updatePrompt({
          generationConfig: {
            ...agentPromptConfig.generationConfig,
            temperature,
          },
        });
      }
    };

    const updateTopP = (e: InputEvent) => {
      const topP = Number((e.target as HTMLInputElement).value);
      if (!isNaN(topP)) {
        this.updatePrompt({
          generationConfig: {...agentPromptConfig.generationConfig, topP},
        });
      }
    };

    const updateFrequencyPenalty = (e: InputEvent) => {
      const frequencyPenalty = Number((e.target as HTMLInputElement).value);
      if (!isNaN(frequencyPenalty)) {
        this.updatePrompt({
          generationConfig: {
            ...agentPromptConfig.generationConfig,
            frequencyPenalty,
          },
        });
      }
    };

    const updatePresencePenalty = (e: InputEvent) => {
      const presencePenalty = Number((e.target as HTMLInputElement).value);
      if (!isNaN(presencePenalty)) {
        this.updatePrompt({
          generationConfig: {
            ...agentPromptConfig.generationConfig,
            presencePenalty,
          },
        });
      }
    };

    const updateDisableSafetyFilters = (e: Event) => {
      const disableSafetyFilters = (e.target as HTMLInputElement).checked;
      this.updatePrompt({
        generationConfig: {
          ...agentPromptConfig.generationConfig,
          disableSafetyFilters,
        },
      });
    };

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Sampling parameters</div>
          <div class="description">
            Currently only used for OpenAI and OAI-compatible APIs.
          </div>
        </div>
        <div class="field">
          <label for="temperature">Temperature</label>
          <div class="description">
            The lower this value, the more deterministic the model's outcome
            will be.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="0.0"
              max="1.0"
              step="0.1"
              .value=${generationConfig.temperature}
              @input=${updateTemperature}
            />
          </div>
        </div>
        <div class="field">
          <label for="topP">Top P</label>
          <div class="description">
            If this value is less than 1.0, the model will discard unlikely
            tokens and sample from only tokens comprising that much probability
            mass.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="0.0"
              max="1.0"
              step="0.1"
              .value=${generationConfig.topP}
              @input=${updateTopP}
            />
          </div>
        </div>
        <div class="field">
          <label for="frequencyPenalty">Frequency penalty</label>
          <div class="description">
            Positive values will penalize tokens based on how frequently they
            have appeared in the text.
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="0.0"
              max="2.0"
              step="0.1"
              .value=${generationConfig.frequencyPenalty}
              @input=${updateFrequencyPenalty}
            />
          </div>
        </div>
        <div class="field">
          <label for="presencePenalty">Presence penalty</label>
          <div class="description">
            Positive values will penalize tokens that have already appeared in
            the text (regardless of frequency).
          </div>
          <div class="number-input">
            <input
              .disabled=${!this.experimentEditor.isCreator}
              type="number"
              min="0.0"
              max="2.0"
              step="0.1"
              .value=${generationConfig.presencePenalty}
              @input=${updatePresencePenalty}
            />
          </div>
        </div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${generationConfig.disableSafetyFilters ?? false}
            ?disabled=${!this.experimentEditor.isCreator}
            @change=${updateDisableSafetyFilters}
          >
          </md-checkbox>
          <div>
            Disable safety filters
            <span class="small">
              (Only supported for Gemini. Uses BLOCK_NONE threshold instead of
              BLOCK_ONLY_HIGH)
            </span>
          </div>
        </div>
      </div>
    `;
  }

  private renderAgentCustomRequestBodyFields(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const addField = () => {
      const customRequestBodyFields = [
        ...agentPromptConfig.generationConfig.customRequestBodyFields,
        {name: '', value: ''},
      ];
      this.updatePrompt({
        generationConfig: {
          ...agentPromptConfig.generationConfig,
          customRequestBodyFields,
        },
      });
    };

    const generationConfig = agentPromptConfig.generationConfig;

    return html`
      <div class="section">
        <div class="section-header">
          <div class="section-title">Custom request body fields</div>
          <div class="description">Add custom fields to the request body.</div>
        </div>
        ${generationConfig.customRequestBodyFields.map((field, fieldIndex) =>
          this.renderAgentCustomRequestBodyField(
            agent,
            agentPromptConfig,
            field,
            fieldIndex,
          ),
        )}
        <pr-button @click=${addField}>Add field</pr-button>
      </div>
    `;
  }

  private renderAgentCustomRequestBodyField(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
    field: {name: string; value: string},
    fieldIndex: number,
  ) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      const genConfig = agentPromptConfig.generationConfig;
      const customRequestBodyFields = [
        ...genConfig.customRequestBodyFields.slice(0, fieldIndex),
        {...genConfig.customRequestBodyFields[fieldIndex], name},
        ...genConfig.customRequestBodyFields.slice(fieldIndex + 1),
      ];
      this.updatePrompt({
        generationConfig: {...genConfig, customRequestBodyFields},
      });
    };

    const updateValue = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      const genConfig = agentPromptConfig.generationConfig;
      const customRequestBodyFields = [
        ...genConfig.customRequestBodyFields.slice(0, fieldIndex),
        {...genConfig.customRequestBodyFields[fieldIndex], value},
        ...genConfig.customRequestBodyFields.slice(fieldIndex + 1),
      ];
      this.updatePrompt({
        generationConfig: {...genConfig, customRequestBodyFields},
      });
    };

    const deleteField = () => {
      const genConfig = agentPromptConfig.generationConfig;
      const customRequestBodyFields = [
        ...genConfig.customRequestBodyFields.slice(0, fieldIndex),
        ...genConfig.customRequestBodyFields.slice(fieldIndex + 1),
      ];
      this.updatePrompt({
        generationConfig: {...genConfig, customRequestBodyFields},
      });
    };
    return html`
      <div class="name-value-input">
        <pr-textarea
         label="Field name"
         variant="outlined"
         .value=${field.name}
         @input=${updateName}
        >
        </pr-textarea>
        <pr-textarea
         label="Field value"
         variant="outlined"
         .value=${field.value}
         @input=${updateValue}
        >
        </pr-textarea>
        <pr-icon-button
          icon="close"
          color="neutral"
          padding="small"
          variant="default"
          ?disabled=${!this.experimentEditor.isCreator}
          @click=${deleteField}
        >
      </div>
    `;
  }

  // TODO(mkbehr): allow for reordering config fields
  private renderAgentStructuredOutputConfig(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const config = agentPromptConfig.structuredOutputConfig;
    const updateConfig = (
      structuredOutputConfig: Partial<ChatMediatorStructuredOutputConfig>,
    ) => {
      this.updatePrompt({
        structuredOutputConfig: {
          ...agentPromptConfig.structuredOutputConfig,
          ...structuredOutputConfig,
        },
      });
    };
    const updateEnabled = () => {
      const enabled = !config.enabled;
      updateConfig({enabled});
    };
    const updateAppendToPrompt = () => {
      const appendToPrompt = !config.appendToPrompt;
      updateConfig({appendToPrompt});
    };
    const updateType = (e: Event) => {
      const type = (e.target as HTMLSelectElement)
        .value as StructuredOutputType;
      // For JSON_FORMAT, appendToPrompt is enforced (must be true)
      if (type === StructuredOutputType.JSON_FORMAT) {
        updateConfig({type, appendToPrompt: true});
      } else {
        updateConfig({type});
      }
    };

    const mainSettings = () => {
      if (!config.enabled) {
        return nothing;
      }
      return html`
        <div class="field">
          <label for="structuredOutputType">Structured Output Type</label>
          <div class="description">
            Controls how JSON output is requested from the model.
          </div>
          <select
            id="structuredOutputType"
            @change=${updateType}
            ?disabled=${!this.experimentEditor.canEditStages}
          >
            <option
              value="${StructuredOutputType.NONE}"
              ?selected=${config.type === StructuredOutputType.NONE}
            >
              None (plain text response)
            </option>
            <option
              value="${StructuredOutputType.JSON_FORMAT}"
              ?selected=${config.type === StructuredOutputType.JSON_FORMAT}
            >
              JSON Format (prompt-based parsing)
            </option>
            <option
              value="${StructuredOutputType.JSON_SCHEMA}"
              ?selected=${config.type === StructuredOutputType.JSON_SCHEMA}
            >
              JSON Schema (native API enforcement)
            </option>
          </select>
        </div>
        ${config.type === StructuredOutputType.JSON_SCHEMA
          ? html`
              <div class="checkbox-wrapper">
                <md-checkbox
                  touch-target="wrapper"
                  ?checked=${config.appendToPrompt}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @click=${updateAppendToPrompt}
                >
                </md-checkbox>
                <div>
                  Include schema instructions in prompt
                  <span class="small">
                    (Optional for JSON_SCHEMA - the API enforces the schema
                    natively, but prompt instructions can help reinforce)
                  </span>
                </div>
              </div>
            `
          : nothing}
        ${this.renderAgentStructuredOutputSchemaFields(
          agent,
          agentPromptConfig,
        )}
      `;
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${config.enabled}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${updateEnabled}
        >
        </md-checkbox>
        <div>Enable structured outputs</div>
      </div>
      ${mainSettings()}
    `;
  }

  private renderAgentStructuredOutputSchemaFields(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
  ) {
    const config = agentPromptConfig.structuredOutputConfig;
    const addField = () => {
      const newField = {
        name: '',
        schema: {type: StructuredOutputDataType.STRING, description: ''},
      };
      const schema = agentPromptConfig.structuredOutputConfig.schema ?? {
        type: StructuredOutputDataType.OBJECT,
        properties: [newField],
      };
      schema.properties = [...(schema.properties ?? []), newField];
      updateConfig({schema});
    };
    const updateConfig = (
      structuredOutputConfig: Partial<ChatMediatorStructuredOutputConfig>,
    ) => {
      this.updatePrompt({
        structuredOutputConfig: {
          ...agentPromptConfig.structuredOutputConfig,
          ...structuredOutputConfig,
        },
      });
    };
    const updateMessageField = (e: InputEvent) => {
      const messageField = (e.target as HTMLTextAreaElement).value;
      updateConfig({messageField});
    };
    const updateExplanationField = (e: InputEvent) => {
      const explanationField = (e.target as HTMLTextAreaElement).value;
      updateConfig({explanationField});
    };
    const updateShouldRespondField = (e: InputEvent) => {
      const shouldRespondField = (e.target as HTMLTextAreaElement).value;
      updateConfig({shouldRespondField});
    };

    return html`
      <div class="subsection">
        <div class="subsection-header">
          <div>Structured output schema fields</div>
          <div class="description">
            Add fields to the structured output schema.
          </div>
        </div>
        ${config.schema?.properties?.map((field, fieldIndex) =>
          this.renderAgentStructuredOutputSchemaField(
            agent,
            agentPromptConfig,
            field,
            fieldIndex,
          ),
        )}
        <pr-button @click=${addField}>Add field</pr-button>
      </div>
      <div class="field">
        <pr-textarea
          label="JSON field to extract debugging explanation or chain of thought from"
          placeholder="JSON field to extract debugging explanation from"
          variant="outlined"
          .value=${config.explanationField}
          ?disabled=${!this.experimentEditor.isCreator}
          @input=${updateExplanationField}
        >
        </pr-textarea>
      </div>
      <div class="field">
        <pr-textarea
          label="JSON field to extract boolean decision to respond from"
          placeholder="JSON field to extract boolean decision to respond from"
          variant="outlined"
          .value=${config.shouldRespondField}
          ?disabled=${!this.experimentEditor.isCreator}
          @input=${updateShouldRespondField}
        >
        </pr-textarea>
      </div>
      <div class="field">
        <pr-textarea
          label="JSON field to extract chat message from"
          placeholder="JSON field to extract chat message from"
          variant="outlined"
          .value=${config.messageField}
          ?disabled=${!this.experimentEditor.isCreator}
          @input=${updateMessageField}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderAgentStructuredOutputSchemaField(
    agent: AgentPersonaConfig,
    agentPromptConfig: ChatPromptConfig,
    field: {name: string; schema: StructuredOutputSchema},
    fieldIndex: number,
  ) {
    const updateConfig = (
      structuredOutputConfig: Partial<ChatMediatorStructuredOutputConfig>,
    ) => {
      this.updatePrompt({
        structuredOutputConfig: {
          ...agentPromptConfig.structuredOutputConfig,
          ...structuredOutputConfig,
        },
      });
    };

    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      const schema = agentPromptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        const oldName = schema.properties[fieldIndex].name;
        schema.properties[fieldIndex] = {
          name,
          schema: schema.properties[fieldIndex].schema,
        };

        // Update field references if the renamed field was being used
        // Only update if oldName is not empty (to avoid binding new fields to cleared references)
        const config = agentPromptConfig.structuredOutputConfig;
        const updates: Partial<ChatMediatorStructuredOutputConfig> = {schema};

        if (oldName !== '') {
          const fieldRefs = [
            'shouldRespondField',
            'messageField',
            'explanationField',
            'readyToEndField',
          ] as const;
          fieldRefs.forEach((ref) => {
            if (config[ref] === oldName) {
              updates[ref] = name;
            }
          });
        }

        updateConfig(updates);
      }
    };

    const updateType = (e: Event) => {
      const type = (e.target as HTMLSelectElement)
        .value as StructuredOutputDataType;
      const schema = agentPromptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        schema.properties[fieldIndex] = {
          name: schema.properties[fieldIndex].name,
          schema: {...schema.properties[fieldIndex].schema, type},
        };
        updateConfig({schema});
      }
    };

    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      const schema = agentPromptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        schema.properties[fieldIndex] = {
          name: schema.properties[fieldIndex].name,
          schema: {...schema.properties[fieldIndex].schema, description},
        };
        updateConfig({schema});
      }
    };

    const deleteField = () => {
      const schema = agentPromptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        const deletedFieldName = schema.properties[fieldIndex].name;
        schema.properties = [
          ...schema.properties.slice(0, fieldIndex),
          ...schema.properties.slice(fieldIndex + 1),
        ];

        // Clear field references if the deleted field was being used
        const config = agentPromptConfig.structuredOutputConfig;
        const updates: Partial<ChatMediatorStructuredOutputConfig> = {schema};

        const fieldRefs = [
          'shouldRespondField',
          'messageField',
          'explanationField',
          'readyToEndField',
        ] as const;
        fieldRefs.forEach((ref) => {
          if (config[ref] === deletedFieldName) {
            updates[ref] = '';
          }
        });

        updateConfig(updates);
      }
    };

    return html`
      <div class="name-value-input">
        <pr-textarea
          label="Field name"
          variant="outlined"
          .value=${field.name}
          @input=${updateName}
        >
        </pr-textarea>
        <div class="select-field">
          <div class="field-title">Field type</div>
          <select .value=${field.schema.type} @change=${updateType}>
            <option value="${StructuredOutputDataType.STRING}">STRING</option>
            <option value="${StructuredOutputDataType.NUMBER}">NUMBER</option>
            <option value="${StructuredOutputDataType.INTEGER}">INTEGER</option>
            <option value="${StructuredOutputDataType.BOOLEAN}">BOOLEAN</option>
          </select>
        </div>
        <pr-textarea
          label="Field description"
          variant="outlined"
          .value=${field.schema.description}
          @input=${updateDescription}
        >
        </pr-textarea>
        <pr-icon-button
          icon="close"
          color="neutral"
          padding="small"
          variant="default"
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${deleteField}
        >
        </pr-icon-button>
      </div>
    `;
  }
}

/** Agent chat prompt dialog */
// TODO: Generalize component for platform-wide dialog use?
@customElement('agent-chat-prompt-dialog')
export class DialogComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [dialogStyles];

  @property() onClose: () => void = () => {};

  override render() {
    return html`
      <div class="dialog full">
        <div class="header">
          <slot name="title"></slot>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${this.onClose}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-chat-prompt-editor': EditorComponent;
    'agent-chat-prompt-dialog': DialogComponent;
  }
}
