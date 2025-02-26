import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';

import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ChatStageConfig,
  StageKind,
  AgentConfig,
  AgentResponseConfig,
  createAgentConfig,
  DEFAULT_JSON_FORMATTING_INSTRUCTIONS,
  DEFAULT_STRING_FORMATTING_INSTRUCTIONS,
  checkApiKeyExists,
} from '@deliberation-lab/utils';
import {LLM_AGENT_AVATARS} from '../../shared/constants';
import {getHashBasedColor} from '../../shared/utils';

import {styles} from './chat_editor.scss';

/** Chat editor for configuring agents. */
@customElement('chat-editor')
export class ChatEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly authService = core.getService(AuthService);

  @property() stage: ChatStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    // Check if experimenter's API key exists
    let apiCheck;
    if (!checkApiKeyExists(this.authService.experimenterData)) {
      apiCheck = html`
        <div class="warning">
          <b>Note:</b> In order for LLM calls to work, you must add an API key
          or server configuration under Experimenter Settings.
        </div>
      `;
    } else {
      apiCheck = html`
        <div class="notification">
          <b>✅ A valid API key has been added. If it is valid, LLM calls will work.
        </div>
      `;
    }

    return html`
      <div class="title">Conversation settings</div>
      ${this.renderTimeLimit()}
      <div class="divider"></div>
      <div class="title">Agent settings</div>
      ${apiCheck}
      ${this.stage.agents.map((agent, index) => this.renderAgent(agent, index))}
      <pr-button
        color="secondary"
        variant="tonal"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.addAgent();
        }}
      >
        Add agent
      </pr-button>
    `;
  }

  private renderTimeLimit() {
    const timeLimit = this.stage?.timeLimitInMinutes ?? null;

    const updateCheck = () => {
      if (!this.stage) return;
      if (this.stage.timeLimitInMinutes) {
        this.experimentEditor.updateStage({
          ...this.stage,
          timeLimitInMinutes: null,
        });
      } else {
        this.experimentEditor.updateStage({
          ...this.stage,
          timeLimitInMinutes: 20, // Default to 20 if checked
        });
      }
    };

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const timeLimit = Number((e.target as HTMLTextAreaElement).value);
      this.experimentEditor.updateStage({
        ...this.stage,
        timeLimitInMinutes: timeLimit,
      });
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${timeLimit !== null}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>Disable conversation after a fixed amount of time</div>
        </div>
        ${timeLimit !== null
          ? html`
              <div class="number-input tab">
                <label for="timeLimit">
                  Elapsed time from first message to conversation close (in
                  minutes)
                </label>
                <input
                  type="number"
                  id="timeLimit"
                  name="timeLimit"
                  min="0"
                  .value=${timeLimit}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @input=${updateNum}
                />
              </div>
            `
          : ''}
      </div>
    `;
  }

  addAgent() {
    if (!this.stage) return;
    const agents = [...this.stage.agents, createAgentConfig()];

    this.experimentEditor.updateStage({
      ...this.stage,
      agents,
    });
  }

  deleteAgent(index: number) {
    if (!this.stage) return;

    const agents = [
      ...this.stage.agents.slice(0, index),
      ...this.stage.agents.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      agents,
    });
  }

  updateAgent(agent: AgentConfig, index: number) {
    if (!this.stage) return;

    const agents = [
      ...this.stage.agents.slice(0, index),
      agent,
      ...this.stage.agents.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      agents,
    });
  }

  private renderAgentName(agent: AgentConfig, index: number) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.updateAgent(
        {
          ...agent,
          name,
        },
        index,
      );
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

  private renderAgentModel(agent: AgentConfig, index: number) {
    const updateModel = (e: InputEvent) => {
      const model = (e.target as HTMLTextAreaElement).value;
      this.updateAgent(
        {
          ...agent,
          model,
        },
        index,
      );
    };

    return html`
      <pr-textarea
        label="Model"
        placeholder="Model ID"
        variant="outlined"
        .value=${agent.model}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateModel}
      >
      </pr-textarea>
    `;
  }

  private renderAgentPrompt(agent: AgentConfig, index: number) {
    const updatePrompt = (e: InputEvent) => {
      const prompt = (e.target as HTMLTextAreaElement).value;
      this.updateAgent(
        {
          ...agent,
          prompt,
        },
        index,
      );
    };

    return html`
      <div class="question-label">Prompt</div>
      <div class="description">
        <b>Note:</b> Your custom prompt will be concatenated with the chat
        history (last 10 messages) and sent to the model (i.e., chat history +
        custom prompt => response)
      </div>
      <div class="description">
        <b>If JSON parsing enabled:</b> Make sure to include appropriate
        instructions/examples in your prompt to avoid parsing errors (if the
        specified message field is non-empty, its contents will be turned into a
        chat message). <b>If disabled:</b> non-empty responses will be turned
        into messages.
      </div>
      <pr-textarea
        placeholder="Custom prompt for agent"
        variant="outlined"
        .value=${agent.prompt}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updatePrompt}
      >
      </pr-textarea>
    `;
  }

  private renderAvatars(agent: AgentConfig, index: number) {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatar = LLM_AGENT_AVATARS[value];
      this.updateAgent(
        {
          ...agent,
          avatar,
        },
        index,
      );
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
        <div class="question-label">Avatar</div>
        <div class="radio-wrapper">
          ${LLM_AGENT_AVATARS.map((avatar, index) =>
            renderAvatarRadio(avatar, index),
          )}
        </div>
      </div>
    `;
  }

  private renderAgent(agent: AgentConfig, index: number) {
    const onDelete = () => {
      this.deleteAgent(index);
    };
    return html`
      <div class="question-wrapper">
        <div class="question-label">Agent ${index + 1}</div>
        <div class="question">
          <div class="header">
            <div class="left">${this.renderAgentName(agent, index)}</div>
            <pr-icon-button
              icon="close"
              color="neutral"
              padding="small"
              variant="default"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${onDelete}
            >
            </pr-icon-button>
          </div>
          ${this.renderAvatars(agent, index)}
          ${this.renderAgentModel(agent, index)}
          ${this.renderAgentPrompt(agent, index)}
          ${this.renderAgentResponseConfig(agent, index)}
          ${this.renderAgentWordsPerMinute(agent, index)}
          ${this.renderAgentSamplingParameters(agent, index)}
          ${this.renderAgentCustomRequestBodyFields(agent, index)}
        </div>
      </div>
    `;
  }

  private renderAgentWordsPerMinute(agent: AgentConfig, index: number) {
    const updateWordsPerMinute = (e: InputEvent) => {
      const wordsPerMinute = Number((e.target as HTMLInputElement).value);
      if (!isNaN(wordsPerMinute)) {
        this.updateAgent(
          {
            ...agent,
            wordsPerMinute,
          },
          index,
        );
      }
    };

    return html`
      <div class="question-label">Words per minute</div>
      <div class="description">
        The higher this value, the faster the agent will respond. This can also
        be used to set a priority on which agent should respond first.
      </div>
      <div class="number-input">
        <input
          .disabled=${!this.experimentEditor.canEditStages}
          type="number"
          min="1"
          max="1000"
          .value=${agent.wordsPerMinute}
          @input=${updateWordsPerMinute}
        />
        ${agent.wordsPerMinute < 1 || agent.wordsPerMinute > 1000
          ? html`<div class="error-message">
              Please enter a value between 1 and 1000.
            </div>`
          : nothing}
      </div>
    `;
  }

  private renderAgentSamplingParameters(agent: AgentConfig, index: number) {
    const updateTemperature = (e: InputEvent) => {
      const temperature = Number((e.target as HTMLInputElement).value);
      if (!isNaN(temperature)) {
        this.updateAgent(
          {
            ...agent,
            generationConfig: {
              ...agent.generationConfig,
              temperature,
            },
          },
          index,
        );
      }
    };

    const updateTopP = (e: InputEvent) => {
      const topP = Number((e.target as HTMLInputElement).value);
      if (!isNaN(topP)) {
        this.updateAgent(
          {
            ...agent,
            generationConfig: {
              ...agent.generationConfig,
              topP,
            },
          },
          index,
        );
      }
    };

    const updateFrequencyPenalty = (e: InputEvent) => {
      const frequencyPenalty = Number((e.target as HTMLInputElement).value);
      if (!isNaN(frequencyPenalty)) {
        this.updateAgent(
          {
            ...agent,
            generationConfig: {
              ...agent.generationConfig,
              frequencyPenalty,
            },
          },
          index,
        );
      }
    };

    const updatePresencePenalty = (e: InputEvent) => {
      const presencePenalty = Number((e.target as HTMLInputElement).value);
      if (!isNaN(presencePenalty)) {
        this.updateAgent(
          {
            ...agent,
            generationConfig: {
              ...agent.generationConfig,
              presencePenalty,
            },
          },
          index,
        );
      }
    };

    return html`
      <div class="question-label">Sampling parameters</div>
      <div class="description">
        Currently only used for OpenAI and OAI-compatible APIs.
      </div>
      <label for="temperature">Temperature</label>
      <div class="description">
        The lower this value, the more deterministic the model's outcome will
        be.
      </div>
      <div class="number-input">
        <input
          .disabled=${!this.experimentEditor.canEditStages}
          type="number"
          min="0.0"
          max="1.0"
          step="0.1"
          .value=${agent.generationConfig.temperature}
          @input=${updateTemperature}
        />
      </div>
      <label for="topP">Top P</label>
      <div class="description">
        If this value is less than 1.0, the model will discard unlikely tokens
        and sample from only tokens comprising that much probability mass.
      </div>
      <div class="number-input">
        <input
          .disabled=${!this.experimentEditor.canEditStages}
          type="number"
          min="0.0"
          max="1.0"
          step="0.1"
          .value=${agent.generationConfig.topP}
          @input=${updateTopP}
        />
      </div>
      <label for="frequencyPenalty">Frequency penalty</label>
      <div class="description">
        Positive values will penalize tokens based on how frequently they have
        appeared in the text.
      </div>
      <div class="number-input">
        <input
          .disabled=${!this.experimentEditor.canEditStages}
          type="number"
          min="0.0"
          max="2.0"
          step="0.1"
          .value=${agent.generationConfig.frequencyPenalty}
          @input=${updateFrequencyPenalty}
        />
      </div>
      <label for="presencePenalty">Presence penalty</label>
      <div class="description">
        Positive values will penalize tokens that have already appeared in the
        text (regardless of frequency).
      </div>
      <div class="number-input">
        <input
          .disabled=${!this.experimentEditor.canEditStages}
          type="number"
          min="0.0"
          max="2.0"
          step="0.1"
          .value=${agent.generationConfig.presencePenalty}
          @input=${updatePresencePenalty}
        />
      </div>
    `;
  }

  private renderAgentCustomRequestBodyFields(
    agent: AgentConfig,
    index: number,
  ) {
    const addField = () => {
      this.updateAgent(
        {
          ...agent,
          generationConfig: {
            ...agent.generationConfig,
            customRequestBodyFields: [
              ...agent.generationConfig.customRequestBodyFields,
              {name: '', value: ''},
            ],
          },
        },
        index,
      );
    };

    const updateField = (
      fieldIndex: number,
      field: Partial<{name: string; value: string}>,
    ) => {
      agent.generationConfig.customRequestBodyFields[fieldIndex] = {
        ...agent.generationConfig.customRequestBodyFields[fieldIndex],
        ...field,
      };
      this.updateAgent(agent, index);
    };

    const deleteField = (fieldIndex: number) => {
      agent.generationConfig.customRequestBodyFields = [
        ...agent.generationConfig.customRequestBodyFields.slice(0, index),
        ...agent.generationConfig.customRequestBodyFields.slice(index + 1),
      ];
      this.updateAgent(agent, index);
    };

    return html`
      <div class="question-label">Custom request body fields</div>
      <div class="description">Add custom fields to the request body.</div>
      ${agent.generationConfig.customRequestBodyFields.map(
        (field, fieldIndex) => html`
         <div class="name-value-input">
           <pr-textarea
             label="Field name"
             variant="outlined"
             .value=${field.name}
             @input=${(e: InputEvent) => updateField(fieldIndex, {name: (e.target as HTMLInputElement).value})}
           >
           </pr-textarea>
           <pr-textarea
             label="Field value"
             variant="outlined"
             .value=${field.value}
             @input=${(e: InputEvent) => updateField(fieldIndex, {value: (e.target as HTMLInputElement).value})}
           >
           </pr-textarea>
           <pr-icon-button
              icon="close"
              color="neutral"
              padding="small"
              variant="default"
              ?disabled=${!this.experimentEditor.canEditStages}
              @click=${(e: InputEvent) => deleteField(fieldIndex)}
           >
         </div>
       `,
      )}
      <pr-button @click=${addField}>Add field</pr-button>
    `;
  }

  private renderAgentResponseConfig(agent: AgentConfig, index: number) {
    const config = agent.responseConfig;
    const updateConfig = (responseConfig: AgentResponseConfig) => {
      this.updateAgent({...agent, responseConfig}, index);
    };
    const updateFormattingInstructions = (e: InputEvent) => {
      const instructionsField = (e.target as HTMLTextAreaElement).value;
      updateConfig({...config, formattingInstructions: instructionsField});
    };
    const updateJSON = () => {
      updateConfig({
        ...config,
        isJSON: !config.isJSON,
        formattingInstructions: config.isJSON
          ? DEFAULT_STRING_FORMATTING_INSTRUCTIONS
          : DEFAULT_JSON_FORMATTING_INSTRUCTIONS,
      });
    };
    const updateMessageField = (e: InputEvent) => {
      const messageField = (e.target as HTMLTextAreaElement).value;
      updateConfig({...config, messageField});
    };
    const updateExplanationField = (e: InputEvent) => {
      const explanationField = (e.target as HTMLTextAreaElement).value;
      updateConfig({...config, explanationField});
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${config.isJSON}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${updateJSON}
        >
        </md-checkbox>
        <div>Parse agent response as JSON</div>
      </div>
      <div>
        <pr-textarea
          label="Formatting instructions and examples"
          placeholder="Instructions and examples for formatting the agent response"
          variant="outlined"
          .value=${config.formattingInstructions}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateFormattingInstructions}
        >
        </pr-textarea>
      </div>
      ${!config.isJSON
        ? nothing
        : html`
            <pr-textarea
              label="JSON field to extract chat message from"
              placeholder="JSON field to extract chat message from"
              variant="outlined"
              .value=${config.messageField}
              ?disabled=${!this.experimentEditor.canEditStages}
              @input=${updateMessageField}
            >
            </pr-textarea>
          `}
      ${!config.isJSON
        ? nothing
        : html`
            <pr-textarea
              label="JSON field to extract debugging explanation from"
              placeholder="JSON field to extract debugging explanation from"
              variant="outlined"
              .value=${config.explanationField}
              ?disabled=${!this.experimentEditor.canEditStages}
              @input=${updateExplanationField}
            >
            </pr-textarea>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-editor': ChatEditor;
  }
}
