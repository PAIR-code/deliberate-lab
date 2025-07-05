import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {
  PromptItem,
  PromptItemType,
  StageConfig,
  StageContextPromptItem,
  StageKind,
  StructuredOutputConfig,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputSchema,
  TextPromptItem,
  createDefaultPromptFromText,
  createDefaultStageContextPromptItem,
  makeStructuredOutputPrompt,
  structuredOutputEnabled,
} from '@deliberation-lab/utils';

import {styles} from './structured_prompt_editor.scss';

/** Editor for configuring structured prompt. */
@customElement('structured-prompt-editor')
export class EditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() prompt: PromptItem[] = [];
  @property() stageId = '';
  @property() structuredOutputConfig: StructuredOutputConfig | undefined =
    undefined;
  @property() onUpdate: (prompt: PromptItem[]) => void = (
    prompt: PromptItem[],
  ) => {};

  override render() {
    return this.renderPromptPreview();
  }

  private updatePromptItem(index: number, newItem: PromptItem) {
    this.onUpdate([
      ...this.prompt.slice(0, index),
      newItem,
      ...this.prompt.slice(index + 1),
    ]);
  }

  private addPromptItem(newItem: PromptItem) {
    this.onUpdate([...this.prompt, newItem]);
  }

  private deletePromptItem(index: number) {
    this.onUpdate([
      ...this.prompt.slice(0, index),
      ...this.prompt.slice(index + 1),
    ]);
  }

  private movePromptItemUp(index: number) {
    this.onUpdate([
      ...this.prompt.slice(0, index - 1),
      ...this.prompt.slice(index, index + 1),
      ...this.prompt.slice(index - 1, index),
      ...this.prompt.slice(index + 1),
    ]);
  }

  private movePromptItemDown(index: number) {
    this.onUpdate([
      ...this.prompt.slice(0, index),
      ...this.prompt.slice(index + 1, index + 2),
      ...this.prompt.slice(index, index + 1),
      ...this.prompt.slice(index + 2),
    ]);
  }

  private renderPromptPreview() {
    const getPromptItems = () => {
      if (this.prompt.length === 0) {
        return html`<div class="prompt-item-wrapper">
          ⚠️ No items added yet
        </div>`;
      }
      return this.prompt.map((item, index) =>
        this.renderPromptItem(item, index),
      );
    };
    const getStructuredOutput = () => {
      const config = this.structuredOutputConfig;
      if (config && structuredOutputEnabled(config) && config.schema) {
        return makeStructuredOutputPrompt(config);
      }
      return '';
    };

    const addText = () => {
      this.addPromptItem({type: PromptItemType.TEXT, text: ''});
    };

    const addProfileContext = () => {
      this.addPromptItem({type: PromptItemType.PROFILE_CONTEXT});
    };

    const addProfileInfo = () => {
      this.addPromptItem({type: PromptItemType.PROFILE_INFO});
    };

    const addCurrentStageContext = () => {
      this.addPromptItem(createDefaultStageContextPromptItem(this.stageId));
    };

    const addPastStageContext = () => {
      this.addPromptItem(createDefaultStageContextPromptItem(null));
    };

    return html`
      <div class="prompt-wrapper">
        <div class="header">
          <div class="title">Prompt editor</div>
          <pr-menu
            name="Add item to prompt"
            icon="add_circle"
            color="neutral"
            variant="default"
          >
            <div class="menu-wrapper">
              <div class="menu-item" role="button" @click=${addText}>
                Freeform text
              </div>
              <div
                class="menu-item"
                role="button"
                @click=${addCurrentStageContext}
              >
                Context for current stage
              </div>
              <div
                class="menu-item"
                role="button"
                @click=${addPastStageContext}
              >
                Context for all stages up to current stage (inclusive)
              </div>
              <div class="menu-item" role="button" @click=${addProfileContext}>
                Custom agent context
              </div>
              <div class="menu-item" role="button" @click=${addProfileInfo}>
                Profile info (avatar, name, pronouns)
              </div>
            </div>
          </pr-menu>
        </div>
        <div class="prompt">${getPromptItems()}${getStructuredOutput()}</div>
      </div>
    `;
  }

  private renderPromptItem(item: PromptItem, index: number) {
    const renderItemEditor = () => {
      switch (item.type) {
        case PromptItemType.TEXT:
          return this.renderTextPromptItemEditor(item, index);
        case PromptItemType.STAGE_CONTEXT:
          return this.renderStageContextPromptItemEditor(item, index);
        case PromptItemType.PROFILE_INFO:
          return html`
            <details>
              <summary class="chip tertiary">Profile info</summary>
              <div class="chip-collapsible">
                Name, avatar, pronouns (if defined)
              </div>
            </details>
          `;
        case PromptItemType.PROFILE_CONTEXT:
          return html`
            <details>
              <summary class="chip tertiary">Custom agent context</summary>
              <div class="chip-collapsible">
                Context string provided when specific agent is created (or empty
                string if none)
              </div>
            </details>
          `;
        default:
          return nothing;
      }
    };

    return html`
      <div class="prompt-item-wrapper">
        <div class="prompt-item-editor">${renderItemEditor()}</div>
        <div class="prompt-item-actions">
          <pr-icon-button
            icon="arrow_upward"
            color="neutral"
            variant="default"
            size="small"
            @click=${() => {
              this.movePromptItemUp(index);
            }}
          >
          </pr-icon-button>
          <pr-icon-button
            icon="arrow_downward"
            color="neutral"
            variant="default"
            size="small"
            @click=${() => {
              this.movePromptItemDown(index);
            }}
          >
          </pr-icon-button>
          <pr-icon-button
            icon="close"
            color="neutral"
            variant="default"
            size="small"
            @click=${() => {
              this.deletePromptItem(index);
            }}
          >
          </pr-icon-button>
        </div>
      </div>
    `;
  }

  private renderTextPromptItemEditor(item: TextPromptItem, index: number) {
    const onInput = (e: InputEvent) => {
      const text = (e.target as HTMLTextAreaElement).value;
      this.updatePromptItem(index, {...item, text});
    };

    return html`
      <pr-textarea
        placeholder="Add freeform text here"
        .value=${item.text}
        @input=${onInput}
      >
      </pr-textarea>
    `;
  }

  private renderStageContextPromptItemEditor(
    item: StageContextPromptItem,
    index: number,
  ) {
    const updatePrimaryText = (e: InputEvent) => {
      this.updatePromptItem(index, {
        ...item,
        includePrimaryText: (e.target as HTMLInputElement).checked,
      });
    };

    const updateInfoText = (e: InputEvent) => {
      this.updatePromptItem(index, {
        ...item,
        includeInfoText: (e.target as HTMLInputElement).checked,
      });
    };

    const updateHelpText = (e: InputEvent) => {
      this.updatePromptItem(index, {
        ...item,
        includeHelpText: (e.target as HTMLInputElement).checked,
      });
    };

    const updateStageDisplay = (e: InputEvent) => {
      this.updatePromptItem(index, {
        ...item,
        includeStageDisplay: (e.target as HTMLInputElement).checked,
      });
    };

    const updateParticipantAnswers = (e: InputEvent) => {
      this.updatePromptItem(index, {
        ...item,
        includeParticipantAnswers: (e.target as HTMLInputElement).checked,
      });
    };

    const getTitle = () => {
      if (item.stageId === this.stageId) {
        return 'Context for current stage';
      } else if (!item.stageId) {
        return 'Context for all stages up to current stage (inclusive)';
      } else {
        return `Context for stage "${item.stageId}"`;
      }
    };

    return html`
      <details>
        <summary class="chip primary">${getTitle()}</summary>
        <div class="chip-collapsible secondary">
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includePrimaryText}
              @input=${updatePrimaryText}
            />
            <div>Include stage description</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeInfoText}
              @input=${updateInfoText}
            />
            <div>Include stage info popup</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeHelpText}
              @input=${updateHelpText}
            />
            <div>Include stage help popup</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeStageDisplay}
              @input=${updateStageDisplay}
            />
            <div>
              Include stage content (e.g., chat history, survey questions)
            </div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeParticipantAnswers}
              @input=${updateParticipantAnswers}
            />
            <div>Include participant stage answers</div>
          </label>
        </div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'structured-prompt-editor': EditorComponent;
  }
}
