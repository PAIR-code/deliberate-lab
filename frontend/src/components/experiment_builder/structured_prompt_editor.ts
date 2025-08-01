import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  PromptItem,
  PromptItemType,
  PromptItemGroup,
  StageContextPromptItem,
  StructuredOutputConfig,
  TextPromptItem,
  createDefaultStageContextPromptItem,
  makeStructuredOutputPrompt,
  structuredOutputEnabled,
} from '@deliberation-lab/utils';

import {styles} from './structured_prompt_editor.scss';

/** Editor for configuring structured prompt. */
@customElement('structured-prompt-editor')
export class EditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() prompt: PromptItem[] = [];
  @property() stageId = '';
  @property() structuredOutputConfig: StructuredOutputConfig | undefined =
    undefined;
  @property() onUpdate: (prompt: PromptItem[]) => void = (
    prompt: PromptItem[],
  ) => {};

  override render() {
    const getStructuredOutput = () => {
      const config = this.structuredOutputConfig;
      if (config && structuredOutputEnabled(config) && config.schema) {
        return makeStructuredOutputPrompt(config);
      }
      return '';
    };

    return html`
      <div class="prompt-wrapper">
        <div class="header">
          <div class="title">Prompt editor</div>
          ${this.renderAddMenu(this.prompt, true)}
        </div>
        <div class="prompt">
          ${this.prompt.length === 0
            ? html`<div class="prompt-item-wrapper">⚠️ No items added yet</div>`
            : this.renderItems(this.prompt)}
          ${getStructuredOutput()}
        </div>
      </div>
    `;
  }

  private renderItems(items: PromptItem[], isNested = false) {
    return items.map(
      (item, index) => html`
        <div class="prompt-item-wrapper ${isNested ? 'nested' : ''}">
          <div class="prompt-item-editor">${this.renderItemEditor(item)}</div>
          <div class="prompt-item-actions">
            <pr-icon-button
              icon="arrow_upward"
              color="neutral"
              variant="default"
              size="small"
              @click=${() => this.moveItem(items, index, -1)}
            >
            </pr-icon-button>
            <pr-icon-button
              icon="arrow_downward"
              color="neutral"
              variant="default"
              size="small"
              @click=${() => this.moveItem(items, index, 1)}
            >
            </pr-icon-button>
            <pr-icon-button
              icon="close"
              color="neutral"
              variant="default"
              size="small"
              @click=${() => this.deleteItem(items, index)}
            >
            </pr-icon-button>
          </div>
        </div>
      `,
    );
  }

  private renderItemEditor(item: PromptItem): TemplateResult | typeof nothing {
    switch (item.type) {
      case PromptItemType.TEXT:
        const textItem = item as TextPromptItem;
        return html`
          <pr-textarea
            placeholder="Add freeform text here"
            .value=${textItem.text}
            @input=${(e: Event) =>
              this.updateItem(item, {
                text: (e.target as HTMLTextAreaElement).value,
              })}
          >
          </pr-textarea>
        `;
      case PromptItemType.STAGE_CONTEXT:
        return this.renderStageContext(item as StageContextPromptItem);
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
      case PromptItemType.GROUP:
        const group = item as PromptItemGroup;
        return html`
          <details open>
            <summary class="chip secondary">
              Group:
              <input
                type="text"
                class="group-title-input"
                .value=${group.title}
                @input=${(e: Event) =>
                  this.updateItem(item, {
                    title: (e.target as HTMLInputElement).value,
                  })}
                @click=${(e: Event) => e.stopPropagation()}
              />
            </summary>
            <div class="chip-collapsible group-content">
              <div class="group-header">
                ${this.renderAddMenu(group.items, false)}
              </div>
              <div class="group-items">
                ${group.items.length === 0
                  ? html`<div class="empty-group">No items in group yet</div>`
                  : this.renderItems(group.items, true)}
              </div>
            </div>
          </details>
        `;
      default:
        return nothing;
    }
  }

  private renderStageContext(item: StageContextPromptItem) {
    const currentStageIndex = this.experimentEditor.stages.findIndex(
      (stage) => stage.id === this.stageId,
    );
    const availableStages =
      currentStageIndex >= 0
        ? this.experimentEditor.stages.slice(0, currentStageIndex + 1)
        : [];

    const stageIndexMap = new Map(
      availableStages.map((stage, idx) => [stage.id, idx]),
    );

    const getTitle = () => {
      const stageIndex = stageIndexMap.get(item.stageId);
      if (stageIndex !== undefined) {
        const stage = availableStages[stageIndex];
        return `Stage context: ${stageIndex + 1}. ${stage.name}`;
      }
      return 'Stage context';
    };

    return html`
      <details>
        <summary class="chip primary">${getTitle()}</summary>
        <div class="chip-collapsible secondary">
          <div class="stage-selector">
            <label>Select stage:</label>
            <select
              .value=${item.stageId}
              @change=${(e: Event) =>
                this.updateItem(item, {
                  stageId: (e.target as HTMLSelectElement).value,
                })}
            >
              ${availableStages.map(
                (stage, stageIndex) => html`
                  <option
                    value=${stage.id}
                    ?selected=${stage.id === item.stageId}
                  >
                    ${stageIndex + 1}. ${stage.name}
                  </option>
                `,
              )}
            </select>
          </div>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includePrimaryText}
              @change=${() =>
                this.updateItem(item, {
                  includePrimaryText: !item.includePrimaryText,
                })}
            />
            <div>Include stage description</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeInfoText}
              @change=${() =>
                this.updateItem(item, {includeInfoText: !item.includeInfoText})}
            />
            <div>Include stage info popup</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeHelpText}
              @change=${() =>
                this.updateItem(item, {includeHelpText: !item.includeHelpText})}
            />
            <div>Include stage help popup</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeStageDisplay}
              @change=${() =>
                this.updateItem(item, {
                  includeStageDisplay: !item.includeStageDisplay,
                })}
            />
            <div>
              Include stage content (e.g., chat history, survey questions)
            </div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeParticipantAnswers}
              @change=${() =>
                this.updateItem(item, {
                  includeParticipantAnswers: !item.includeParticipantAnswers,
                })}
            />
            <div>Include participant stage answers</div>
          </label>
        </div>
      </details>
    `;
  }

  private renderAddMenu(targetArray: PromptItem[], isRoot: boolean) {
    return html`
      <pr-menu
        name="Add item"
        icon="add_circle"
        color="neutral"
        variant="default"
        size=${isRoot ? 'medium' : 'small'}
      >
        <div class="menu-wrapper">
          <div
            class="menu-item"
            role="button"
            @click=${() =>
              this.addItem(targetArray, {type: PromptItemType.TEXT, text: ''})}
          >
            Freeform text
          </div>
          <div
            class="menu-item"
            role="button"
            @click=${() =>
              this.addItem(
                targetArray,
                createDefaultStageContextPromptItem(this.stageId),
              )}
          >
            Stage context
          </div>
          <div
            class="menu-item"
            role="button"
            @click=${() =>
              this.addItem(targetArray, {type: PromptItemType.PROFILE_CONTEXT})}
          >
            Custom agent context
          </div>
          <div
            class="menu-item"
            role="button"
            @click=${() =>
              this.addItem(targetArray, {type: PromptItemType.PROFILE_INFO})}
          >
            Profile info (avatar, name, pronouns)
          </div>
          ${isRoot
            ? html`
                <div
                  class="menu-item"
                  role="button"
                  @click=${() =>
                    this.addItem(targetArray, {
                      type: PromptItemType.GROUP,
                      title: 'New Group',
                      items: [],
                    })}
                >
                  Group of items
                </div>
              `
            : nothing}
        </div>
      </pr-menu>
    `;
  }

  private updateItem = (item: PromptItem, updates: Partial<PromptItem>) => {
    Object.assign(item, updates);
    this.onUpdate(this.prompt);
  };

  private addItem(targetArray: PromptItem[], item: PromptItem) {
    targetArray.push(item);
    this.onUpdate(this.prompt);
  }

  private deleteItem(targetArray: PromptItem[], index: number) {
    targetArray.splice(index, 1);
    this.onUpdate(this.prompt);
  }

  private moveItem(
    targetArray: PromptItem[],
    index: number,
    direction: number,
  ) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < targetArray.length) {
      [targetArray[index], targetArray[newIndex]] = [
        targetArray[newIndex],
        targetArray[index],
      ];
      this.onUpdate(this.prompt);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'structured-prompt-editor': EditorComponent;
  }
}
