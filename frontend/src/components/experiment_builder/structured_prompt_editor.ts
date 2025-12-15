import '../../pair-components/icon_button';
import '../../pair-components/menu';
import '../../pair-components/textarea';
import '../../pair-components/textarea_template';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';
import {renderConditionEditor} from '../../shared/condition_editor.utils';

import {
  Condition,
  ConditionOperator,
  ConditionTarget,
  createConditionGroup,
  createDefaultPromptItemGroup,
  createDefaultStageContextPromptItem,
  createShuffleConfig,
  getConditionTargetsFromStages,
  PromptItem,
  PromptItemGroup,
  PromptItemType,
  SeedStrategy,
  ShuffleConfig,
  StageContextPromptItem,
  StageKind,
  TextPromptItem,
} from '@deliberation-lab/utils';

import {styles} from './structured_prompt_editor.scss';

/** Editor for configuring structured prompt. */
@customElement('structured-prompt-editor')
export class EditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() prompt: PromptItem[] = [];
  @property() stageId = '';
  @property() onUpdate: (prompt: PromptItem[]) => void = (
    prompt: PromptItem[],
  ) => {};

  /** Get condition targets from all survey stages before (and including) the current stage. */
  private getConditionTargets() {
    return getConditionTargetsFromStages(
      this.experimentEditor.stages,
      this.stageId,
      {includeCurrentStage: true},
    );
  }

  /** Check if the current stage supports conditions (only private chat, not group chat). */
  private supportsConditions(): boolean {
    const stage = this.experimentEditor.getStage(this.stageId);
    return stage?.kind === StageKind.PRIVATE_CHAT;
  }

  override render() {
    return this.renderPromptPreview();
  }

  private updatePromptItem = (
    item: PromptItem,
    updates: Partial<PromptItem>,
  ) => {
    Object.assign(item, updates);
    this.onUpdate(this.prompt);
  };

  private addPromptItem(targetArray: PromptItem[], item: PromptItem) {
    targetArray.push(item);
    this.onUpdate(this.prompt);
  }

  private deletePromptItem(targetArray: PromptItem[], index: number) {
    targetArray.splice(index, 1);
    this.onUpdate(this.prompt);
  }

  private movePromptItem(
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

  private renderPromptPreview() {
    return html`
      <div class="prompt-wrapper">
        <div class="header">
          <div class="title">Prompt editor</div>
          ${this.renderAddMenu(this.prompt, true)}
        </div>
        <div class="prompt">${this.renderPromptItems(this.prompt)}</div>
      </div>
    `;
  }

  private renderAddMenu(targetArray: PromptItem[], isRoot: boolean) {
    const addText = () => {
      this.addPromptItem(targetArray, {type: PromptItemType.TEXT, text: ''});
    };

    const addProfileContext = () => {
      this.addPromptItem(targetArray, {type: PromptItemType.PROFILE_CONTEXT});
    };

    const addProfileInfo = () => {
      this.addPromptItem(targetArray, {type: PromptItemType.PROFILE_INFO});
    };

    const addStageContext = () => {
      this.addPromptItem(
        targetArray,
        createDefaultStageContextPromptItem(this.stageId),
      );
    };

    const addAllStageContext = () => {
      this.addPromptItem(targetArray, createDefaultStageContextPromptItem(''));
    };

    const addGroup = () => {
      this.addPromptItem(targetArray, createDefaultPromptItemGroup());
    };

    return html`
      <pr-menu
        name="Add item"
        icon="add_circle"
        color="neutral"
        variant="default"
        size=${isRoot ? 'medium' : 'small'}
      >
        <div class="menu-wrapper">
          <div class="menu-item" role="button" @click=${addText}>
            Freeform text
          </div>
          <div class="menu-item" role="button" @click=${addStageContext}>
            Context from single stage
          </div>
          <div class="menu-item" role="button" @click=${addAllStageContext}>
            Context from all stages before this stage
          </div>
          <div class="menu-item" role="button" @click=${addProfileContext}>
            Custom agent context
          </div>
          <div class="menu-item" role="button" @click=${addProfileInfo}>
            Profile info (avatar, name, pronouns)
          </div>
          <div class="menu-item" role="button" @click=${addGroup}>
            Group of items
          </div>
        </div>
      </pr-menu>
    `;
  }

  private renderItemEditor(item: PromptItem): TemplateResult | typeof nothing {
    switch (item.type) {
      case PromptItemType.TEXT:
        return this.renderTextPromptItemEditor(item as TextPromptItem);
      case PromptItemType.STAGE_CONTEXT:
        return this.renderStageContextPromptItemEditor(
          item as StageContextPromptItem,
        );
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
        return this.renderPromptItemGroupEditor(item as PromptItemGroup);
      default:
        return nothing;
    }
  }

  private renderPromptItems(items: PromptItem[], isNested = false) {
    if (items.length === 0) {
      return html`<div
        class="${isNested ? 'empty-group' : 'prompt-item-wrapper'}"
      >
        ${isNested ? 'No items in group yet' : '⚠️ No items added yet'}
      </div>`;
    }

    const conditionTargets = this.getConditionTargets();
    const supportsConditions =
      this.supportsConditions() && conditionTargets.length > 0;

    return items.map((item, index) => {
      const hasCondition = item.condition !== undefined;

      return html`
        <div class="prompt-item-wrapper ${isNested ? 'nested' : ''}">
          <div class="prompt-item-row">
            <div class="prompt-item-editor">${this.renderItemEditor(item)}</div>
            <div class="prompt-item-actions">
              ${supportsConditions && item.type !== PromptItemType.GROUP
                ? html`
                    <pr-icon-button
                      icon="rule"
                      color=${hasCondition ? 'primary' : 'neutral'}
                      variant="default"
                      size="small"
                      title=${hasCondition
                        ? 'Remove display condition'
                        : 'Add display condition'}
                      @click=${() => this.toggleCondition(item)}
                    >
                    </pr-icon-button>
                  `
                : nothing}
              <pr-icon-button
                icon="arrow_upward"
                color="neutral"
                variant="default"
                size="small"
                @click=${() => this.movePromptItem(items, index, -1)}
              >
              </pr-icon-button>
              <pr-icon-button
                icon="arrow_downward"
                color="neutral"
                variant="default"
                size="small"
                @click=${() => this.movePromptItem(items, index, 1)}
              >
              </pr-icon-button>
              <pr-icon-button
                icon="close"
                color="neutral"
                variant="default"
                size="small"
                @click=${() => this.deletePromptItem(items, index)}
              >
              </pr-icon-button>
            </div>
          </div>
          ${hasCondition
            ? this.renderPromptItemCondition(item, conditionTargets)
            : nothing}
        </div>
      `;
    });
  }

  private toggleCondition(item: PromptItem) {
    if (item.condition !== undefined) {
      // Remove condition
      this.updatePromptItem(item, {condition: undefined});
    } else {
      // Add an empty condition group - user will add conditions via the editor
      this.updatePromptItem(item, {
        condition: createConditionGroup(ConditionOperator.AND, []),
      });
    }
  }

  private renderPromptItemCondition(
    item: PromptItem,
    conditionTargets: ConditionTarget[],
  ) {
    const onConditionChange = (condition: Condition | undefined) => {
      this.updatePromptItem(item, {condition});
    };

    return html`
      <div class="prompt-item-condition">
        ${renderConditionEditor({
          condition: item.condition,
          targets: conditionTargets,
          canEdit: this.experimentEditor.canEditStages,
          onConditionChange,
        })}
      </div>
    `;
  }

  private renderTextPromptItemEditor(item: TextPromptItem) {
    const onInput = (e: InputEvent) => {
      const text = (e.target as HTMLTextAreaElement).value;
      this.updatePromptItem(item, {text: text});
    };
    return html`
      <pr-textarea-template
        placeholder="Add freeform text here"
        .value=${item.text}
        @input=${onInput}
      >
      </pr-textarea-template>
    `;
  }

  private renderStageContextPromptItemEditor(item: StageContextPromptItem) {
    // Get available stages up to and including current stage
    const currentStageIndex = this.experimentEditor.stages.findIndex(
      (stage) => stage.id === this.stageId,
    );
    const availableStages =
      currentStageIndex >= 0
        ? this.experimentEditor.stages.slice(0, currentStageIndex + 1)
        : [];

    // Create a map from stage ID to index for quick lookup
    const stageIndexMap = new Map(
      availableStages.map((stage, idx) => [stage.id, idx]),
    );

    const allStagesText =
      'Context for all stages before and including this stage';

    const getTitle = () => {
      if (!item.stageId) {
        return allStagesText;
      }
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
                this.updatePromptItem(item, {
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
              <option value=${''} ?selected=${!item.stageId}>
                ${allStagesText}
              </option>
            </select>
          </div>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includePrimaryText}
              @change=${() =>
                this.updatePromptItem(item, {
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
                this.updatePromptItem(item, {
                  includeInfoText: !item.includeInfoText,
                })}
            />
            <div>Include stage info popup</div>
          </label>
          <label class="checkbox-wrapper">
            <input
              type="checkbox"
              .checked=${item.includeStageDisplay}
              @change=${() =>
                this.updatePromptItem(item, {
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
                this.updatePromptItem(item, {
                  includeParticipantAnswers: !item.includeParticipantAnswers,
                })}
            />
            <div>Include participant stage answers</div>
          </label>
        </div>
      </details>
    `;
  }

  private renderPromptItemGroupEditor(group: PromptItemGroup) {
    return html`
      <details open>
        <summary class="chip secondary">
          Group:
          <input
            type="text"
            class="group-title-input"
            .value=${group.title}
            @input=${(e: Event) =>
              this.updatePromptItem(group, {
                title: (e.target as HTMLInputElement).value,
              })}
            @click=${(e: Event) => e.stopPropagation()}
          />
          ${renderShuffleIndicator(group.shuffleConfig)}
        </summary>
        <div class="chip-collapsible group-content">
          ${this.renderShuffleEditor(group)}
          <div class="group-header">
            ${this.renderAddMenu(group.items, false)}
          </div>
          <div class="group-items">
            ${this.renderPromptItems(group.items, true)}
          </div>
        </div>
      </details>
    `;
  }

  private renderShuffleEditor(group: PromptItemGroup) {
    if (!group.shuffleConfig) return nothing;
    const shuffleConfig = group.shuffleConfig;

    return html`
      <div class="shuffle-config">
        <label class="checkbox-wrapper">
          <input
            type="checkbox"
            .checked=${shuffleConfig.shuffle}
            @change=${() =>
              this.updatePromptItem(group, {
                shuffleConfig: createShuffleConfig({
                  ...shuffleConfig,
                  shuffle: !shuffleConfig.shuffle,
                }),
              })}
          />
          <div>Shuffle items in this group</div>
        </label>

        ${shuffleConfig.shuffle
          ? html`
              <label>using seed:</label>
              <select
                .value=${shuffleConfig.seed}
                @change=${(e: Event) =>
                  this.updatePromptItem(group, {
                    shuffleConfig: createShuffleConfig({
                      ...shuffleConfig,
                      seed: ((e.target as HTMLSelectElement).value ||
                        '') as SeedStrategy,
                    }),
                  })}
              >
                <option
                  value=${SeedStrategy.EXPERIMENT}
                  ?selected=${shuffleConfig.seed === SeedStrategy.EXPERIMENT}
                >
                  Experiment ID
                </option>
                <option
                  value=${SeedStrategy.COHORT}
                  ?selected=${shuffleConfig.seed === SeedStrategy.COHORT}
                >
                  Cohort ID
                </option>
                <option
                  value=${SeedStrategy.PARTICIPANT}
                  ?selected=${shuffleConfig.seed === SeedStrategy.PARTICIPANT}
                >
                  Participant ID
                </option>
                <option
                  value=${SeedStrategy.CUSTOM}
                  ?selected=${shuffleConfig.seed === SeedStrategy.CUSTOM}
                >
                  Custom seed
                </option>
              </select>

              ${shuffleConfig.seed === SeedStrategy.CUSTOM
                ? html`
                    <input
                      type="text"
                      placeholder="Enter custom seed"
                      .value=${shuffleConfig.customSeed}
                      @input=${(e: Event) =>
                        this.updatePromptItem(group, {
                          shuffleConfig: createShuffleConfig({
                            ...shuffleConfig,
                            customSeed: (e.target as HTMLInputElement).value,
                          }),
                        })}
                    />
                  `
                : ''}
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'structured-prompt-editor': EditorComponent;
  }
}

/** Helper function to generate shuffle indicator template */
export function renderShuffleIndicator(
  shuffleConfig: ShuffleConfig | undefined,
): TemplateResult | typeof nothing {
  if (!shuffleConfig?.shuffle) return nothing;

  return html`
    <span title="Shuffle enabled">
      🔀
      ${shuffleConfig.seed}${shuffleConfig.seed === SeedStrategy.CUSTOM
        ? `: ${shuffleConfig.customSeed}`
        : ''}
    </span>
  `;
}
