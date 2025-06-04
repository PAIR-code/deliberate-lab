import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/textarea';
import './agent_base_prompt_dialog';
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
  AgentPersonaConfig,
  ApiKeyType,
  BaseAgentPromptConfig,
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

import {styles} from './agent_base_prompt_editor.scss';

/** Editor for configuring agent base prompt. */
@customElement('agent-base-prompt-editor')
export class AgentEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentEditor = core.getService(AgentEditor);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentService = core.getService(ExperimentService);

  @property() agentConfig: AgentPersonaConfig | undefined = undefined;
  @property() stageConfig: StageConfig | undefined = undefined;
  @state() isTestButtonLoading = false;

  override render() {
    if (!this.agentConfig || !this.stageConfig) {
      return nothing;
    }

    const promptConfig = this.agentEditor.getAgentMediatorPrompt(
      this.agentConfig.id,
      this.stageConfig.id,
    );

    return html`
      <div class="section-header">
        <div class="section-title">${this.stageConfig.name}</div>
        ${this.renderDialogButton(
          this.stageConfig,
          this.agentConfig,
          promptConfig,
        )}
      </div>
      ${this.renderMainPromptEditor(
        this.stageConfig,
        this.agentConfig,
        promptConfig,
      )}
      ${this.renderDialog(this.stageConfig, this.agentConfig, promptConfig)}
    `;
  }

  private renderDialog(
    stageConfig: StageConfig,
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig | undefined,
  ) {
    if (stageConfig.id !== this.agentEditor.activeStageId) {
      return nothing;
    }

    return html`
      <base-agent-prompt-dialog
        .stageConfig=${stageConfig}
        .agentConfig=${agentConfig}
      >
        ${this.renderStageEditor(stageConfig, agentConfig, promptConfig)}
        <slot></slot>
      </base-agent-prompt-dialog>
    `;
  }

  private renderDialogButton(
    stageConfig: StageConfig,
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig | undefined,
  ) {
    if (!promptConfig) {
      return nothing;
    }

    return html`
      <pr-button
        variant="default"
        color="neutral"
        @click=${() => {
          this.agentEditor.setActiveStageId(stageConfig.id);
        }}
      >
        <div class="button-wrapper">
          <pr-icon icon="settings" variant="default" color="neutral"> </pr-icon>
          <div>Advanced settings</div>
        </div>
      </pr-button>
    `;
  }

  private renderStageEditor(
    stageConfig: StageConfig,
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig | undefined,
  ) {
    const renderPromptSettings = (promptConfig: BaseAgentPromptConfig) => {
      return html`
        <div>${this.renderTestPromptButton(agentConfig, promptConfig)}</div>
        <div class="divider"></div>
        <div class="section">
          <div class="section-title">Prompt settings</div>
          ${this.renderAgentPrompt(agentConfig, promptConfig)}
          ${this.renderAgentStructuredOutputConfig(agentConfig, promptConfig)}
          ${this.renderPromptPreview(promptConfig)}
        </div>
        <div class="divider"></div>
        ${this.renderAgentSamplingParameters(agentConfig, promptConfig)}
        <div class="divider"></div>
        ${this.renderAgentCustomRequestBodyFields(agentConfig, promptConfig)}
        <div class="divider"></div>
        <slot></slot>
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

    return html`
      <div class="agent-wrapper">
        ${promptConfig ? renderPromptSettings(promptConfig) : renderAddButton()}
      </div>
    `;
  }

  private renderMainPromptEditor(
    stageConfig: StageConfig,
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig | undefined,
  ) {
    const renderPromptSettings = (promptConfig: BaseAgentPromptConfig) => {
      return html` ${this.renderAgentPrompt(agentConfig, promptConfig)} `;
    };

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

    return html`
      <div class="agent-wrapper">
        ${promptConfig ? renderPromptSettings(promptConfig) : renderAddButton()}
      </div>
    `;
  }

  private renderTestPromptButton(
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig,
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

  private renderAgentPrompt(
    agent: AgentPersonaConfig,
    agentPromptConfig: BaseAgentPromptConfig,
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
      <md-filled-text-field
        required
        type="textarea"
        rows="5"
        label="Custom prompt for agent (will be concatenated with chat history and sent to model)"
        .error=${!agentPromptConfig.promptContext}
        .value=${agentPromptConfig.promptContext}
        ?disabled=${!this.experimentEditor.isCreator}
        @input=${updatePrompt}
      >
      </md-filled-text-field>
    `;
  }

  private renderPromptPreview(agentPromptConfig: BaseAgentPromptConfig) {
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
      this.agentEditor.updateAgentMediatorProfile(agent.id, {avatar});
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

  private renderAgentSamplingParameters(
    agent: AgentPersonaConfig,
    agentPromptConfig: BaseAgentPromptConfig,
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
      </div>
    `;
  }

  private renderAgentCustomRequestBodyFields(
    agent: AgentPersonaConfig,
    agentPromptConfig: BaseAgentPromptConfig,
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
    agent: AgentPersonaConfig,
    agentPromptConfig: BaseAgentPromptConfig,
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
          ?disabled=${!this.experimentEditor.isCreator}
          @click=${deleteField}
        >
      </div>
    `;
  }

  // TODO(mkbehr): allow for reordering config fields
  private renderAgentStructuredOutputConfig(
    agent: AgentPersonaConfig,
    agentPromptConfig: BaseAgentPromptConfig,
  ) {
    const config = agentPromptConfig.structuredOutputConfig;
    const updateConfig = (
      structuredOutputConfig: Partial<StructuredOutputConfig>,
    ) => {
      this.agentEditor.updateAgentMediatorStructuredOutputConfig(
        agent.id,
        agentPromptConfig.id,
        structuredOutputConfig,
      );
    };
    const updateEnabled = () => {
      const enabled = !config.enabled;
      updateConfig({enabled});
    };
    const updateAppendToPrompt = () => {
      const appendToPrompt = !config.appendToPrompt;
      updateConfig({appendToPrompt});
    };
    const updateType = (e: InputEvent) => {
      const type = (e.target as HTMLSelectElement)
        .value as StructuredOutputType;
      updateConfig({type});
    };

    const mainSettings = () => {
      if (!config.enabled) {
        return nothing;
      }
      return html`
        <div class="field">
          <label for="structuredOutputType">Structured Output Type</label>
          <div class="description">
            Constrain the sampler to produce valid JSON. Only supported for
            Gemini.
          </div>
          <select
            id="structuredOutputType"
            .selected=${config.type}
            @change=${updateType}
            ?disabled=${!this.experimentEditor.canEditStages}
          >
            <option value="${StructuredOutputType.NONE}">
              No output forcing
            </option>
            <option value="${StructuredOutputType.JSON_FORMAT}">
              Force JSON output
            </option>
            <option value="${StructuredOutputType.JSON_SCHEMA}">
              Force JSON output with schema
            </option>
          </select>
        </div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${config.appendToPrompt}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateAppendToPrompt}
          >
          </md-checkbox>
          <div>
            Include explanation of structured output format in prompt
            <span class="small">
              (e.g., "Return only valid JSON according to the following
              schema...")
            </span>
          </div>
        </div>
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
    agentPromptConfig: BaseAgentPromptConfig,
  ) {
    const config = agentPromptConfig.structuredOutputConfig;
    const addField = () => {
      this.agentEditor.addAgentMediatorStructuredOutputSchemaField(
        agent.id,
        agentPromptConfig.id,
      );
    };
    const updateConfig = (
      structuredOutputConfig: Partial<StructuredOutputConfig>,
    ) => {
      this.agentEditor.updateAgentMediatorStructuredOutputConfig(
        agent.id,
        agentPromptConfig.id,
        structuredOutputConfig,
      );
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
    agentPromptConfig: BaseAgentPromptConfig,
    field: {name: string; schema: StructuredOutputSchema},
    fieldIndex: number,
  ) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorStructuredOutputSchemaField(
        agent.id,
        agentPromptConfig.id,
        fieldIndex,
        {name: name},
      );
    };

    const updateType = (e: Event) => {
      const type = (e.target as HTMLSelectElement)
        .value as StructuredOutputDataType;
      this.agentEditor.updateAgentMediatorStructuredOutputSchemaField(
        agent.id,
        agentPromptConfig.id,
        fieldIndex,
        {schema: {type: type}},
      );
    };

    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgentMediatorStructuredOutputSchemaField(
        agent.id,
        agentPromptConfig.id,
        fieldIndex,
        {schema: {description: description}},
      );
    };

    const deleteField = () => {
      this.agentEditor.deleteAgentMediatorStructuredOutputSchemaField(
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

declare global {
  interface HTMLElementTagNameMap {
    'agent-base-prompt-editor': AgentEditorComponent;
  }
}
