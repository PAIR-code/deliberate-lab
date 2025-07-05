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
        default:
          return html`
            <details>
              <summary class="chip tertiary">${item.type}</summary>
              <div class="chip-collapsible">${JSON.stringify(item)}</div>
            </details>
          `;
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
      this.updatePromptItem(index, {type: PromptItemType.TEXT, text});
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
}

declare global {
  interface HTMLElementTagNameMap {
    'structured-prompt-editor': EditorComponent;
  }
}
