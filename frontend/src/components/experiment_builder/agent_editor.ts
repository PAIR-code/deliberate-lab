import '../../pair-components/button';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AgentEditor} from '../../services/agent.editor';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  AgentChatPromptConfig,
  AgentMediatorConfig,
  ApiKeyType,
  StageConfig,
  StageKind,
  checkApiKeyExists,
} from '@deliberation-lab/utils';
import {LLM_AGENT_AVATARS} from '../../shared/constants';
import {getHashBasedColor} from '../../shared/utils';

import {styles} from './agent_editor.scss';

/** Editor for configuring agents. */
@customElement('agent-editor')
export class AgentEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentEditor = core.getService(AgentEditor);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() agent: AgentMediatorConfig | undefined = undefined;
  @state() isTestButtonLoading = false;

  override render() {
    if (this.agent === undefined) {
      return html`
        <div class="agent-wrapper">
          <div>Select an agent to edit.</div>
        </div>
      `;
    }

    const agentConfig = this.agent;
    // TODO: Add API key check
    return html`
      ${this.renderAgentNav(agentConfig)}
      ${this.renderAgentContent(agentConfig)}
    `;
  }

  private renderAgentNav(agentConfig: AgentMediatorConfig) {
    const stages = this.experimentEditor.stages;
    const isActive = (stageId: string) => {
      return stageId === this.agentEditor.activeStageId;
    };
    return html`
      <div class="agent-nav">
        <div
          class="nav-item ${isActive('') ? 'active' : ''}"
          @click=${() => {
            this.agentEditor.setActiveStageId('');
          }}
        >
          Agent settings
        </div>
        ${stages.map((stage, index) => {
          if (stage.kind === StageKind.CHAT) {
            return html`
              <div
                class="nav-item ${isActive(stage.id) ? 'active' : ''}"
                @click=${() => {
                  this.agentEditor.setActiveStageId(stage.id);
                }}
              >
                ${index + 1}. ${stage.name}
              </div>
            `;
          } else {
            return nothing;
          }
        })}
        <div class="description">
          Note: Add stages with chat discussions (e.g., chat stage) to your
          experiment in order to specify agent mediator prompts here.
        </div>
      </div>
    `;
  }

  private renderAgentContent(agentConfig: AgentMediatorConfig) {
    const activeStageId = this.agentEditor.activeStageId;
    if (activeStageId === '') {
      return this.renderAgentGeneralSettings(agentConfig);
    }

    const stage = this.experimentEditor.stages.find(
      (stage) => stage.id === activeStageId,
    );

    if (!stage) {
      return html`
        <div class="agent-wrapper">
          <div>Stage not found</div>
        </div>
      `;
    }

    return this.renderStageEditor(stage, agentConfig);
  }

  private renderStageEditor(
    stageConfig: StageConfig,
    agentConfig: AgentMediatorConfig,
  ) {
    const renderAddButton = () => {
      return html`
        <div class="field">
          <pr-button
            @click=${() => {
              this.agentEditor.addAgentMediatorPrompt(
                agentConfig.id,
                stageConfig,
              );
            }}
          >
            Add prompt
          </pr-button>
          <div class="description">
            If no prompt, the agent will not be called during this stage.
          </div>
        </div>
      `;
    };

    const renderPromptSettings = (promptConfig: AgentChatPromptConfig) => {
      return html`
        <div>${this.renderTestPromptButton(agentConfig, promptConfig)}</div>
        <div class="divider"></div>
        ${this.renderAgentPrompt(agentConfig, promptConfig)}
        ${this.renderAgentWordsPerMinute(agentConfig, promptConfig)}
        ${this.renderAgentSamplingParameters(agentConfig, promptConfig)}
        ${this.renderAgentCustomRequestBodyFields(agentConfig, promptConfig)}
        <div class="divider"></div>
        <pr-button
          color="error"
          variant="outlined"
          @click=${() => {
            this.agentEditor.deleteAgentMediatorPrompt(
              agentConfig.id,
              stageConfig.id,
            );
          }}
        >
          Delete prompt
        </pr-button>
      `;
    };

    const promptConfig = this.agentEditor.getAgentMediatorPrompt(
      agentConfig.id,
      stageConfig.id,
    );

    return html`
      <div class="agent-wrapper">
        <div class="header">
          <div class="title">${stageConfig.name}</div>
          <div class="chip tertiary">${stageConfig.kind}</div>
        </div>
        ${promptConfig ? renderPromptSettings(promptConfig) : renderAddButton()}
      </div>
    `;
  }

  private renderAgentGeneralSettings(agentConfig: AgentMediatorConfig) {
    return html`
      <div class="agent-wrapper">
        ${this.renderAgentPrivateName(agentConfig)}
        ${this.renderAgentName(agentConfig)} ${this.renderAvatars(agentConfig)}
        ${this.renderAgentApiType(agentConfig)}
        ${this.renderAgentModel(agentConfig)}
        <div class="divider"></div>
        ${this.renderDeleteAgentButton(agentConfig)}
      </div>
    `;
  }

  private renderTestPromptButton(
    agentConfig: AgentMediatorConfig,
    promptConfig: AgentChatPromptConfig,
  ) {
    const onClick = async () => {
      this.isTestButtonLoading = true;
      await this.agentEditor.testAgentConfig(agentConfig, promptConfig);
      this.isTestButtonLoading = false;
    };

    // TODO: Test prompt with fake chat data?
    const response = this.agentEditor.getTestResponse(
      agentConfig.id,
      promptConfig.id,
    );
    return html`
      <div class="field">
        <pr-button
          ?loading=${this.isTestButtonLoading}
          color="secondary"
          variant="tonal"
          @click=${onClick}
        >
          Test prompt
        </pr-button>
        ${response.length > 0 ? html`<div>${response}</div>` : nothing}
      </div>
    `;
  }

  private renderDeleteAgentButton(agent: AgentMediatorConfig) {
    const onClick = () => {
      this.agentEditor.deleteAgentMediator(agent.id);
    };

    return html`
      <pr-button color="error" variant="outlined" @click=${onClick}>
        Delete agent mediator
      </pr-button>
    `;
  }

  private renderAgentPrivateName(agent: AgentMediatorConfig) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorPrivateName(agent.id, name);
    };

    return html`
      <pr-textarea
        label="Private agent name (viewable to experimenters only)*"
        placeholder="E.g., Gemini Pro Agent"
        variant="outlined"
        .value=${agent.privateName}
        class=${agent.privateName.length === 0 ? 'required' : ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }

  private renderAgentName(agent: AgentMediatorConfig) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorName(agent.id, name);
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Display name for agent"
        variant="outlined"
        .value=${agent.name}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }

  private renderAgentApiType(agentConfig: AgentMediatorConfig) {
    return html`
      <div class="section">
        <div class="field-title">LLM API</div>
        <div class="action-buttons">
          ${this.renderApiTypeButton(
            agentConfig,
            'Gemini',
            ApiKeyType.GEMINI_API_KEY,
          )}
          ${this.renderApiTypeButton(
            agentConfig,
            'OpenAI or compatible API',
            ApiKeyType.OPENAI_API_KEY,
          )}
          ${this.renderApiTypeButton(
            agentConfig,
            'Ollama Server',
            ApiKeyType.OLLAMA_CUSTOM_URL,
          )}
        </div>
      </div>
    `;
  }

  private renderApiTypeButton(
    agentConfig: AgentMediatorConfig,
    apiName: string,
    apiType: ApiKeyType,
  ) {
    const updateAgentAPI = () => {
      this.agentEditor.updateAgentMediatorModelSettings(agentConfig.id, {
        apiType,
      });
    };

    const isActive = apiType === agentConfig.defaultModelSettings.apiType;
    return html`
      <pr-button
        color="${isActive ? 'primary' : 'neutral'}"
        variant=${isActive ? 'tonal' : 'default'}
        @click=${updateAgentAPI}
      >
        ${apiName}
      </pr-button>
    `;
  }

  private renderAgentModel(agent: AgentMediatorConfig) {
    const updateModel = (e: InputEvent) => {
      const modelName = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorModelSettings(agent.id, {modelName});
    };

    return html`
      <pr-textarea
        label="Model"
        placeholder="Model ID"
        variant="outlined"
        .value=${agent.defaultModelSettings.modelName}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateModel}
      >
      </pr-textarea>
    `;
  }

  private renderAgentPrompt(
    agent: AgentMediatorConfig,
    agentPromptConfig: AgentChatPromptConfig,
  ) {
    const updatePrompt = (e: InputEvent) => {
      const promptContext = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorPromptConfig(
        agent.id,
        agentPromptConfig.id,
        {promptContext},
      );
    };

    return html`
      <div class="field">
        <div class="field-title">Prompt</div>
        <div class="description">
          <b>Note:</b> Your custom prompt will be concatenated with the chat
          history (last 10 messages) and sent to the model (i.e., chat history +
          custom prompt => response)
        </div>
        <pr-textarea
          placeholder="Custom prompt for agent"
          variant="outlined"
          .value=${agentPromptConfig.promptContext}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updatePrompt}
        >
        </pr-textarea>
      </div>
    `;
  }

  private renderAvatars(agent: AgentMediatorConfig) {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatar = LLM_AGENT_AVATARS[value];
      this.agentEditor.updateAgentMediatorAvatar(agent.id, avatar);
    };

    const renderAvatarRadio = (emoji: string, index: number) => {
      return html`
        <div class="radio-button">
          <md-radio
            id=${emoji}
            name="${agent.id}-avatar"
            value=${index}
            aria-label=${emoji}
            ?checked=${agent.avatar === emoji}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${handleAvatarClick}
          >
          </md-radio>
          <avatar-icon
            .emoji=${emoji}
            .square=${true}
            .color=${getHashBasedColor(emoji)}
          >
          </avatar-icon>
        </div>
      `;
    };

    return html`
      <div class="radio-question">
        <div class="radio-question-label">Avatar</div>
        <div class="radio-wrapper">
          ${LLM_AGENT_AVATARS.map((avatar, index) =>
            renderAvatarRadio(avatar, index),
          )}
        </div>
      </div>
    `;
  }

  private renderAgentWordsPerMinute(
    agent: AgentMediatorConfig,
    agentPromptConfig: AgentChatPromptConfig,
  ) {
    const updateWordsPerMinute = (e: InputEvent) => {
      const wordsPerMinute = Number((e.target as HTMLInputElement).value);
      if (!isNaN(wordsPerMinute)) {
        this.agentEditor.updateAgentMediatorChatSettings(
          agent.id,
          agentPromptConfig.id,
          {wordsPerMinute},
        );
      }
    };

    const currentWPM = agentPromptConfig.chatSettings.wordsPerMinute;
    return html`
      <div class="field">
        <div class="field-title">Words per minute</div>
        <div class="description">
          The higher this value, the faster the agent will respond. This can
          also be used to set a priority on which agent should respond first.
        </div>
        <div class="number-input">
          <input
            .disabled=${!this.experimentEditor.canEditStages}
            type="number"
            min="1"
            max="1000"
            .value=${currentWPM}
            @input=${updateWordsPerMinute}
          />
          ${currentWPM < 1 || currentWPM > 1000
            ? html`<div class="error-message">
                Please enter a value between 1 and 1000.
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }

  private renderAgentSamplingParameters(
    agent: AgentMediatorConfig,
    agentPromptConfig: AgentChatPromptConfig,
  ) {
    const generationConfig = agentPromptConfig.generationConfig;

    const updateTemperature = (e: InputEvent) => {
      const temperature = Number((e.target as HTMLInputElement).value);
      if (!isNaN(temperature)) {
        this.agentEditor.updateAgentMediatorGenerationConfig(
          agent.id,
          agentPromptConfig.id,
          {temperature},
        );
      }
    };

    const updateTopP = (e: InputEvent) => {
      const topP = Number((e.target as HTMLInputElement).value);
      if (!isNaN(topP)) {
        this.agentEditor.updateAgentMediatorGenerationConfig(
          agent.id,
          agentPromptConfig.id,
          {topP},
        );
      }
    };

    const updateFrequencyPenalty = (e: InputEvent) => {
      const frequencyPenalty = Number((e.target as HTMLInputElement).value);
      if (!isNaN(frequencyPenalty)) {
        this.agentEditor.updateAgentMediatorGenerationConfig(
          agent.id,
          agentPromptConfig.id,
          {frequencyPenalty},
        );
      }
    };

    const updatePresencePenalty = (e: InputEvent) => {
      const presencePenalty = Number((e.target as HTMLInputElement).value);
      if (!isNaN(presencePenalty)) {
        this.agentEditor.updateAgentMediatorGenerationConfig(
          agent.id,
          agentPromptConfig.id,
          {presencePenalty},
        );
      }
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
              .disabled=${!this.experimentEditor.canEditStages}
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
              .disabled=${!this.experimentEditor.canEditStages}
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
              .disabled=${!this.experimentEditor.canEditStages}
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
              .disabled=${!this.experimentEditor.canEditStages}
              type="number"
              min="0.0"
              max="2.0"
              step="0.1"
              .value=${generationConfig.presencePenalty}
              @input=${updatePresencePenalty}
            />
          </div>
        </div>
      </div>
    `;
  }

  private renderAgentCustomRequestBodyFields(
    agent: AgentMediatorConfig,
    agentPromptConfig: AgentChatPromptConfig,
  ) {
    const addField = () => {
      this.agentEditor.addAgentMediatorCustomRequestBodyField(
        agent.id,
        agentPromptConfig.id,
      );
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
    agent: AgentMediatorConfig,
    agentPromptConfig: AgentChatPromptConfig,
    field: {name: string; value: string},
    fieldIndex: number,
  ) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorCustomRequestBodyField(
        agent.id,
        agentPromptConfig.id,
        fieldIndex,
        {name},
      );
    };

    const updateValue = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorCustomRequestBodyField(
        agent.id,
        agentPromptConfig.id,
        fieldIndex,
        {value},
      );
    };

    const deleteField = () => {
      this.agentEditor.deleteAgentMediatorCustomRequestBodyField(
        agent.id,
        agentPromptConfig.id,
        fieldIndex,
      );
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
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${deleteField}
         >
       </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-editor': AgentEditorComponent;
  }
}
