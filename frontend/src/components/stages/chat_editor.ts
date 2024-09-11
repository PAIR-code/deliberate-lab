import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ChatStageConfig,
  StageKind,
  MediatorConfig,
  createMediatorConfig,
} from '@deliberation-lab/utils';
import {
  LLM_MEDIATOR_AVATARS
} from '../../shared/constants';

import {styles} from './chat_editor.scss';

/** Chat editor for configuring mediators. */
@customElement('chat-editor')
export class ChatEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: ChatStageConfig|undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.stage.mediators.map(
        (mediator, index) => this.renderMediator(mediator, index)
      )}
      <pr-button
        color="secondary"
        variant="tonal"
        @click=${() => {this.addMediator()}}
      >
        Add mediator
      </pr-button>
    `;
  }

  addMediator() {
    if (!this.stage) return;
    const mediators = [
      ...this.stage.mediators,
      createMediatorConfig(),
    ];

    this.experimentEditor.updateStage({
      ...this.stage,
      mediators,
    });
  }

  deleteMediator(index: number) {
    if (!this.stage) return;

    const mediators = [
      ...this.stage.mediators.slice(0, index),
      ...this.stage.mediators.slice(index + 1)
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
      ...this.stage.mediators.slice(index + 1)
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
        }, index
      );
    };

    return html`
      <pr-textarea
        label="Name"
        placeholder="Display name for mediator"
        variant="outlined"
        .value=${mediator.name}
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
        }, index
      );
    };

    return html`
      <div class="question-label">Prompt</div>
      <div class="description">
        <b>Note:</b> Your custom prompt will be concatenated with the
        chat history (last 10 messages) and sent to the model
        (i.e., chat history + custom prompt => response)
      </div>
      <pr-textarea
        placeholder="Custom prompt for mediator"
        variant="outlined"
        .value=${mediator.prompt}
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
        }, index
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
          ${LLM_MEDIATOR_AVATARS.map(
            (avatar, index) => renderAvatarRadio(avatar, index)
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
            <div class="left">
              ${this.renderMediatorName(mediator, index)}
            </div>
            <pr-icon-button
              icon="close"
              color="neutral"
              padding="small"
              variant="default"
              @click=${onDelete}>
            </pr-icon-button>
          </div>
          ${this.renderAvatars(mediator, index)}
          ${this.renderMediatorPrompt(mediator, index)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-editor': ChatEditor;
  }
}