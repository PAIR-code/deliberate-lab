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
  MediatorConfig,
  MediatorResponseConfig,
  createMediatorConfig,
  DEFAULT_JSON_FORMATTING_INSTRUCTIONS,
  DEFAULT_STRING_FORMATTING_INSTRUCTIONS,
  checkApiKeyExists,
} from '@deliberation-lab/utils';
import {LLM_MEDIATOR_AVATARS} from '../../shared/constants';

import {styles} from './chat_editor.scss';

/** Chat editor for configuring mediators. */
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
          <b>Note:</b> In order for LLM calls to work, you must add an API key or server configuration under Experimenter Settings.
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
      ${this.stage.mediators.map((mediator, index) =>
        this.renderMediator(mediator, index)
      )}
      <pr-button
        color="secondary"
        variant="tonal"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.addMediator();
        }}
      >
        Add mediator
      </pr-button>
    `;
  }

  private renderTimeLimit() {
    const timeLimit = this.stage?.timeLimitInMinutes;

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
  
  addMediator() {
    if (!this.stage) return;
    const mediators = [...this.stage.mediators, createMediatorConfig()];

    this.experimentEditor.updateStage({
      ...this.stage,
      mediators,
    });
  }

  deleteMediator(index: number) {
    if (!this.stage) return;

    const mediators = [
      ...this.stage.mediators.slice(0, index),
      ...this.stage.mediators.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      mediators,
    });
  }

  updateMediator(mediator: MediatorConfig, index: number) {
    if (!this.stage) return;

    const mediators = [
      ...this.stage.mediators.slice(0, index),
      mediator,
      ...this.stage.mediators.slice(index + 1),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      mediators,
    });
  }

  private renderMediatorName(mediator: MediatorConfig, index: number) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.updateMediator(
        {
          ...mediator,
          name,
        },
        index
      );
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Display name for mediator"
        variant="outlined"
        .value=${mediator.name}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }

  private renderMediatorPrompt(mediator: MediatorConfig, index: number) {
    const updatePrompt = (e: InputEvent) => {
      const prompt = (e.target as HTMLTextAreaElement).value;
      this.updateMediator(
        {
          ...mediator,
          prompt,
        },
        index
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
        placeholder="Custom prompt for mediator"
        variant="outlined"
        .value=${mediator.prompt}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updatePrompt}
      >
      </pr-textarea>
    `;
  }

  private renderAvatars(mediator: MediatorConfig, index: number) {
    const handleAvatarClick = (e: Event) => {
      const value = Number((e.target as HTMLInputElement).value);
      const avatar = LLM_MEDIATOR_AVATARS[value];
      this.updateMediator(
        {
          ...mediator,
          avatar,
        },
        index
      );
    };

    const renderAvatarRadio = (emoji: string, index: number) => {
      return html`
        <div class="radio-button">
          <md-radio
            id=${emoji}
            name="${mediator.id}-avatar"
            value=${index}
            aria-label=${emoji}
            ?checked=${mediator.avatar === emoji}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${handleAvatarClick}
          >
          </md-radio>
          <profile-avatar .emoji=${emoji} .square=${true}></profile-avatar>
        </div>
      `;
    };

    return html`
      <div class="radio-question">
        <div class="question-label">Avatar</div>
        <div class="radio-wrapper">
          ${LLM_MEDIATOR_AVATARS.map((avatar, index) =>
            renderAvatarRadio(avatar, index)
          )}
        </div>
      </div>
    `;
  }

  private renderMediator(mediator: MediatorConfig, index: number) {
    const onDelete = () => {
      this.deleteMediator(index);
    };
    return html`
      <div class="question-wrapper">
        <div class="question-label">Mediator ${index + 1}</div>
        <div class="question">
          <div class="header">
            <div class="left">${this.renderMediatorName(mediator, index)}</div>
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
          ${this.renderAvatars(mediator, index)}
          ${this.renderMediatorPrompt(mediator, index)}
          ${this.renderMediatorResponseConfig(mediator, index)}
        </div>
      </div>
    `;
  }

  private renderMediatorResponseConfig(
    mediator: MediatorConfig,
    index: number
  ) {
    const config = mediator.responseConfig;
    const updateConfig = (responseConfig: MediatorResponseConfig) => {
      this.updateMediator({...mediator, responseConfig}, index);
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
        <div>Parse mediator response as JSON</div>
      </div>
      <div>
        <pr-textarea
          label="Formatting instructions and examples"
          placeholder="Instructions and examples for formatting the mediator response"
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
