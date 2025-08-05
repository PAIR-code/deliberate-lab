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
  StageConfig,
  StageKind,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputSchema,
  createDefaultPromptFromText,
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
          <div class="section-title">
            ${this.stageNamePrefix}${stageConfig.name}
          </div>
          <div class="description">
            ${this.agent.type === AgentPersonaType.PARTICIPANT
              ? 'No prompt customizations currently available for this stage.'
              : 'Agent mediators do not interact with this stage.'}
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
        ${promptConfig
          ? html`
              ${this.renderAgentPrompt(this.agent, promptConfig)}
              ${this.renderDialog(stageConfig, promptConfig)}
            `
          : this.renderAddButton()}
      </div>
    `;
  }

  private renderAddButton() {
    return html`
      <pr-button variant="tonal" @click=${this.addPrompt}>Add prompt</pr-button>
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
    if (!this.agent || !oldPrompt) {
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
    const renderPromptItem = (item: PromptItem): unknown => {
      switch (item.type) {
        case PromptItemType.TEXT:
          const textItem = item as TextPromptItem;
          return html`<div>${textItem.text}</div>`;
        case PromptItemType.GROUP:
          const group = item as PromptItemGroup;
          // prettier-ignore
          return html`<details class="prompt-group-preview" open><summary class="chip tertiary">GROUP: ${group.title} ${renderShuffleIndicator(group.shuffleConfig)}</summary><div class="chip-collapsible">${group.items.map((subItem) => renderPromptItem(subItem))}</div></details>`;
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
        schema.properties[fieldIndex] = {
          name,
          schema: schema.properties[fieldIndex].schema,
        };
        updateConfig({schema});
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
        schema.properties = [
          ...schema.properties.slice(0, fieldIndex),
          ...schema.properties.slice(fieldIndex + 1),
        ];
        updateConfig({schema});
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
