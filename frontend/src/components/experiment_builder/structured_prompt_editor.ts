import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
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

  private renderPromptPreview() {
    const getPromptItems = () => {
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

    return html`
      <div class="prompt">${getPromptItems()}${getStructuredOutput()}</div>
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
            disabled
            icon="arrow_upward"
            color="neutral"
            variant="default"
            size="small"
          >
          </pr-icon-button>
          <pr-icon-button
            disabled
            icon="arrow_downward"
            color="neutral"
            variant="default"
            size="small"
          >
          </pr-icon-button>
          <pr-icon-button
            disabled
            icon="close"
            color="neutral"
            variant="default"
            size="small"
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
        placeholder="Add prompt context here"
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
