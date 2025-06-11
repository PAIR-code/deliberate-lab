import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import './agent_base_prompt_editor';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AgentEditor} from '../../services/agent.editor';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentService} from '../../services/experiment.service';

import {
  AgentChatPromptConfig,
  AgentPersonaConfig,
  AgentPersonaType,
  ApiKeyType,
  StageConfig,
  StageKind,
  StructuredOutputConfig,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputSchema,
  makeStructuredOutputPrompt,
  structuredOutputEnabled,
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
  private readonly experimentService = core.getService(ExperimentService);

  @property() agent: AgentPersonaConfig | undefined = undefined;
  @state() isTestButtonLoading = false;

  override render() {
    if (this.agent === undefined) {
      return html`
        <div class="agent-wrapper">
          <div>Select an agent to edit.</div>
          ${this.renderOutdatedWarning()}
        </div>
      `;
    }

    const agentConfig = this.agent;
    // TODO: Add API key check
    return html`
      ${this.renderAgentGeneralSettings(agentConfig)}
      ${this.renderAgentPrompts(agentConfig)}
      <div class="divider main"></div>
      <div class="agent-wrapper">
        ${this.renderDeleteAgentButton(agentConfig)}
      </div>
    `;
  }

  private renderOutdatedWarning() {
    if (!this.experimentService.experiment) return nothing;

    if (this.experimentService.experiment.versionId < 16) {
      return html`
        <p>
          ⚠️ Agents saved in a previous version of Deliberate Lab may not
          automatically load in the current version. Contact the deployment
          owners if you would like to migrate your previously saved agents to
          this new agents tab.
        </p>
      `;
    }
    return nothing;
  }

  private renderAgentGeneralSettings(agentConfig: AgentPersonaConfig) {
    return html`
      <div class="agent-wrapper">
        ${this.renderAgentPrivateName(agentConfig)}
        ${this.renderAgentName(agentConfig)} ${this.renderAvatars(agentConfig)}
        ${this.renderAgentApiType(agentConfig)}
        ${this.renderAgentModel(agentConfig)}
      </div>
    `;
  }

  private renderAgentPrompts(agentConfig: AgentPersonaConfig) {
    const stages = this.experimentEditor.stages;
    const isActive = (stageId: string) => {
      return stageId === this.agentEditor.activeStageId;
    };

    const renderMediatorNote = () => {
      return html`
        <div class="description">
          Note: Mediators only have prompts for chat stages!
        </div>
      `;
    };

    const renderEmpty = () => {
      if (
        stages.filter((stage) => stage.kind === StageKind.CHAT).length === 0
      ) {
        return html`
          <div class="divider"></div>
          <div class="agent-wrapper">
            ⚠️ No chat stages yet.
            <div class="description">
              Use the ${this.renderAddStageButton()} button in the left panel to
              add more stages to your experiment.
            </div>
          </div>
        `;
      }
      return nothing;
    };

    return html`
        <div class="divider main"></div>
        <div class="agent-wrapper">
          <div class="title">Stage prompts</div>
          ${agentConfig.type === AgentPersonaType.MEDIATOR ? renderMediatorNote() : nothing}
        </div>
        ${renderEmpty()}
        ${stages.map((stage, index) => {
          if (stage.kind === StageKind.CHAT) {
            const promptConfig = this.agentEditor.getAgentChatPrompt(
              agentConfig.id,
              stage.id,
            );
            return html`
              <div class="divider"></div>
              <agent-base-prompt-editor
                .agentConfig=${agentConfig}
                .stageConfig=${stage}
              >
                ${promptConfig
                  ? this.renderAgentWordsPerMinute(agentConfig, promptConfig)
                  : nothing}
              </agent-base-prompt-editor>
            `;
          } else {
            return nothing;
          }
        })}
      </div>
    `;
  }

  private renderAddStageButton() {
    return html`
      <pr-icon-button
        size="small"
        icon="playlist_add"
        color="neutral"
        variant="default"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.experimentEditor.toggleStageBuilderDialog(false);
        }}
      >
      </pr-icon-button>
    `;
  }

  private renderDeleteAgentButton(agent: AgentPersonaConfig) {
    const onClick = () => {
      this.agentEditor.deleteAgent(agent.id);
    };

    return html`
      <pr-button
        color="error"
        variant="outlined"
        @click=${onClick}
        ?disabled=${!this.experimentEditor.canEditStages}
      >
        Delete agent
        ${agent.type === AgentPersonaType.MEDIATOR ? 'mediator' : 'participant'}
        persona
      </pr-button>
    `;
  }

  private renderAgentPrivateName(agent: AgentPersonaConfig) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentPrivateName(agent.id, name);
    };

    return html`
      <md-filled-text-field
        label="Private agent name (viewable to experimenters only)"
        .value=${agent.name}
        class=${agent.name.length === 0 ? 'required' : ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </md-filled-text-field>
    `;
  }

  private renderAgentName(agent: AgentPersonaConfig) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentProfile(agent.id, {name});
    };

    return html`
      <md-filled-text-field
        required
        label="Display name for agent"
        .error="$!agent.defaultProfile.name}"
        .value=${agent.defaultProfile.name}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </md-filled-text-field>
    `;
  }

  private renderAgentApiType(agentConfig: AgentPersonaConfig) {
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
    agentConfig: AgentPersonaConfig,
    apiName: string,
    apiType: ApiKeyType,
  ) {
    const updateAgentAPI = () => {
      this.agentEditor.updateAgentChatModelSettings(agentConfig.id, {
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

  private renderAgentModel(agent: AgentPersonaConfig) {
    const updateModel = (e: InputEvent) => {
      const modelName = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentChatModelSettings(agent.id, {modelName});
    };

    return html`
      <md-filled-text-field
        required
        label="Model ID"
        .error=${!agent.defaultModelSettings.modelName}
        .value=${agent.defaultModelSettings.modelName}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateModel}
      >
      </md-filled-text-field>
    `;
  }

  private renderAgentPrompt(
    agent: AgentPersonaConfig,
    agentPromptConfig: AgentChatPromptConfig,
  ) {
    const updatePrompt = (e: InputEvent) => {
      const promptContext = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentChatPromptConfig(
        agent.id,
        agentPromptConfig.id,
        {promptContext},
      );
    };

    return html`
      <md-filled-text-field
        required
        type="textarea"
        rows="10"
        label="Custom prompt for agent (will be concatenated with chat history and sent to model)"
        .error=${!agentPromptConfig.promptContext}
        .value=${agentPromptConfig.promptContext}
        ?disabled=${!this.experimentEditor.isCreator}
        @input=${updatePrompt}
      >
      </md-filled-text-field>
    `;
  }

  private renderPromptPreview(agentPromptConfig: AgentChatPromptConfig) {
    const config = agentPromptConfig.structuredOutputConfig;
    let prompt = agentPromptConfig.promptContext;
    if (structuredOutputEnabled(config) && config.schema) {
      prompt += `\n${makeStructuredOutputPrompt(config)}`;
    }
    return html`
      <div class="code-wrapper">
        <div class="field-title">Prompt preview</div>
        <pre><code>${prompt}</code></pre>
      </div>
    `;
  }

  private renderAvatars(agent: AgentPersonaConfig) {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatar = LLM_AGENT_AVATARS[value];
      this.agentEditor.updateAgentProfile(agent.id, {avatar});
    };

    const renderAvatarRadio = (emoji: string, index: number) => {
      return html`
        <div class="radio-button">
          <md-radio
            id=${emoji}
            name="${agent.id}-avatar"
            value=${index}
            aria-label=${emoji}
            ?checked=${agent.defaultProfile.avatar === emoji}
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
    agent: AgentPersonaConfig,
    agentPromptConfig: AgentChatPromptConfig,
  ) {
    const updateWordsPerMinute = (e: InputEvent) => {
      const wordsPerMinute = Number((e.target as HTMLInputElement).value);
      if (!isNaN(wordsPerMinute)) {
        this.agentEditor.updateAgentChatSettings(
          agent.id,
          agentPromptConfig.id,
          {wordsPerMinute},
        );
      }
    };

    const currentWPM = agentPromptConfig?.chatSettings?.wordsPerMinute ?? 0;
    return html`
      <div class="field">
        <div class="field-title">Words per minute</div>
        <div class="description">
          The higher this value, the faster the agent will respond. This can
          also be used to set a priority on which agent should respond first.
        </div>
        <div class="number-input">
          <input
            .disabled=${!this.experimentEditor.isCreator}
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
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-editor': AgentEditorComponent;
  }
}
