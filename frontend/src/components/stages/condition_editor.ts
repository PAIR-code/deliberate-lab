import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/textfield/outlined-text-field.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {
  Condition,
  ConditionGroup,
  ComparisonCondition,
  ConditionOperator,
  ComparisonOperator,
  createConditionGroup,
  createComparisonCondition,
  getComparisonOperatorLabel,
  ConditionTargetReference,
  SurveyQuestion,
  SurveyQuestionKind,
  MultipleChoiceSurveyQuestion,
} from '@deliberation-lab/utils';

import {styles} from './condition_editor.scss';

export interface ConditionTarget {
  ref: ConditionTargetReference; // Structured reference
  label: string;
  type: 'text' | 'number' | 'boolean' | 'choice';
  choices?: Array<{id: string; label: string}>;
  stageName?: string; // Optional stage name for display
}

/** Reusable condition editor component */
@customElement('condition-editor')
export class ConditionEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({type: Object}) condition: Condition | undefined = undefined;
  @property({type: Array}) targets: ConditionTarget[] = [];
  @property() onConditionChange: (condition: Condition | undefined) => void =
    () => {};

  override render() {
    const hasCondition = this.condition !== undefined;

    return html`
      <div class="condition-editor">
        <div class="header">
          <div class="title">Display Condition</div>
          ${hasCondition
            ? html`
                <md-text-button @click=${this.removeCondition}>
                  <md-icon slot="icon">delete</md-icon>
                  Remove condition
                </md-text-button>
              `
            : html`
                <md-outlined-button @click=${this.addCondition}>
                  <md-icon slot="icon">add</md-icon>
                  Add condition
                </md-outlined-button>
              `}
        </div>
        ${hasCondition ? this.renderCondition(this.condition!) : nothing}
      </div>
    `;
  }

  private renderCondition(condition: Condition): TemplateResult {
    if (condition.type === 'group') {
      return this.renderConditionGroup(condition);
    } else {
      return this.renderComparisonCondition(condition);
    }
  }

  private renderConditionGroup(group: ConditionGroup): TemplateResult {
    return html`
      <div class="condition-group">
        <div class="group-header">
          <md-outlined-select
            .value=${group.operator}
            @change=${(e: Event) =>
              this.updateGroupOperator(
                group,
                (e.target as HTMLSelectElement).value as ConditionOperator,
              )}
          >
            <md-select-option value=${ConditionOperator.AND}>
              <div slot="headline">ALL conditions must be true (AND)</div>
            </md-select-option>
            <md-select-option value=${ConditionOperator.OR}>
              <div slot="headline">ANY condition must be true (OR)</div>
            </md-select-option>
          </md-outlined-select>
        </div>
        <div class="group-conditions">
          ${group.conditions.map(
            (c, index) => html`
              <div class="condition-item">
                ${this.renderCondition(c)}
                <md-icon-button
                  @click=${() => this.removeConditionFromGroup(group, index)}
                >
                  <md-icon>delete</md-icon>
                </md-icon-button>
              </div>
            `,
          )}
        </div>
        <div class="group-actions">
          <md-text-button @click=${() => this.addComparisonToGroup(group)}>
            <md-icon slot="icon">add</md-icon>
            Add comparison
          </md-text-button>
          <md-text-button @click=${() => this.addSubgroupToGroup(group)}>
            <md-icon slot="icon">add_circle</md-icon>
            Add subgroup
          </md-text-button>
        </div>
      </div>
    `;
  }

  private renderComparisonCondition(condition: ComparisonCondition) {
    // Build display key from structured target
    // Using :: as separator since it's unlikely to appear in IDs
    const conditionKey = `${condition.target.stageId}::${condition.target.questionId}`;

    const target = this.targets.find((t) => {
      const tKey = `${t.ref.stageId}::${t.ref.questionId}`;
      return tKey === conditionKey;
    });

    return html`
      <div class="comparison-condition">
        <md-outlined-select
          class="target-select"
          .value=${conditionKey}
          @change=${(e: Event) =>
            this.updateComparisonTarget(
              condition,
              (e.target as HTMLSelectElement).value,
            )}
        >
          ${this.targets.map((t) => {
            const targetKey = `${t.ref.stageId}::${t.ref.questionId}`;
            return html`
              <md-select-option value=${targetKey}>
                <div slot="headline">
                  ${t.stageName ? `[${t.stageName}] ${t.label}` : t.label}
                </div>
              </md-select-option>
            `;
          })}
        </md-outlined-select>

        <md-outlined-select
          class="operator-select"
          .value=${condition.operator}
          @change=${(e: Event) =>
            this.updateComparisonOperator(
              condition,
              (e.target as HTMLSelectElement).value as ComparisonOperator,
            )}
        >
          ${this.getAvailableOperators(target?.type).map(
            (op) => html`
              <md-select-option value=${op}>
                <div slot="headline">${getComparisonOperatorLabel(op)}</div>
              </md-select-option>
            `,
          )}
        </md-outlined-select>

        ${this.renderComparisonValue(condition, target)}
      </div>
    `;
  }

  private renderComparisonValue(
    condition: ComparisonCondition,
    target?: ConditionTarget,
  ) {
    if (!target) return nothing;

    if (target.type === 'boolean') {
      return html`
        <md-outlined-select
          class="value-select"
          .value=${String(condition.value)}
          @change=${(e: Event) =>
            this.updateComparisonValue(
              condition,
              (e.target as HTMLSelectElement).value === 'true',
            )}
        >
          <md-select-option value="true">
            <div slot="headline">Yes/Checked</div>
          </md-select-option>
          <md-select-option value="false">
            <div slot="headline">No/Unchecked</div>
          </md-select-option>
        </md-outlined-select>
      `;
    } else if (target.type === 'choice' && target.choices) {
      return html`
        <md-outlined-select
          class="value-select"
          .value=${String(condition.value)}
          @change=${(e: Event) =>
            this.updateComparisonValue(
              condition,
              (e.target as HTMLSelectElement).value,
            )}
        >
          ${target.choices.map(
            (choice) => html`
              <md-select-option value=${choice.id}>
                <div slot="headline">${choice.label}</div>
              </md-select-option>
            `,
          )}
        </md-outlined-select>
      `;
    } else if (target.type === 'number') {
      return html`
        <md-outlined-text-field
          class="value-input"
          type="number"
          .value=${String(condition.value)}
          @input=${(e: Event) =>
            this.updateComparisonValue(
              condition,
              Number((e.target as HTMLInputElement).value),
            )}
          placeholder="Enter value"
        ></md-outlined-text-field>
      `;
    } else {
      return html`
        <md-outlined-text-field
          class="value-input"
          .value=${String(condition.value)}
          @input=${(e: Event) =>
            this.updateComparisonValue(
              condition,
              (e.target as HTMLInputElement).value,
            )}
          placeholder="Enter value"
        ></md-outlined-text-field>
      `;
    }
  }

  private getAvailableOperators(type?: string): ComparisonOperator[] {
    if (!type) return [ComparisonOperator.EQUALS];

    switch (type) {
      case 'number':
        return [
          ComparisonOperator.EQUALS,
          ComparisonOperator.NOT_EQUALS,
          ComparisonOperator.GREATER_THAN,
          ComparisonOperator.GREATER_THAN_OR_EQUAL,
          ComparisonOperator.LESS_THAN,
          ComparisonOperator.LESS_THAN_OR_EQUAL,
        ];
      case 'text':
        return [
          ComparisonOperator.EQUALS,
          ComparisonOperator.NOT_EQUALS,
          ComparisonOperator.CONTAINS,
          ComparisonOperator.NOT_CONTAINS,
        ];
      case 'boolean':
      case 'choice':
        return [ComparisonOperator.EQUALS, ComparisonOperator.NOT_EQUALS];
      default:
        return [ComparisonOperator.EQUALS];
    }
  }

  private addCondition() {
    const firstTarget = this.targets[0];
    if (!firstTarget) return;

    const defaultValue =
      firstTarget.type === 'boolean'
        ? false
        : firstTarget.type === 'number'
          ? 0
          : firstTarget.type === 'choice' && firstTarget.choices?.length
            ? firstTarget.choices[0].id
            : '';

    this.condition = createComparisonCondition(
      firstTarget.ref,
      ComparisonOperator.EQUALS,
      defaultValue,
    );
    this.onConditionChange(this.condition);
  }

  private removeCondition() {
    this.condition = undefined;
    this.onConditionChange(undefined);
  }

  private updateGroupOperator(
    group: ConditionGroup,
    operator: ConditionOperator,
  ) {
    group.operator = operator;
    this.onConditionChange(this.condition);
  }

  private addComparisonToGroup(group: ConditionGroup) {
    const firstTarget = this.targets[0];
    if (!firstTarget) return;

    const defaultValue =
      firstTarget.type === 'boolean'
        ? false
        : firstTarget.type === 'number'
          ? 0
          : firstTarget.type === 'choice' && firstTarget.choices?.length
            ? firstTarget.choices[0].id
            : '';

    group.conditions.push(
      createComparisonCondition(
        firstTarget.ref,
        ComparisonOperator.EQUALS,
        defaultValue,
      ),
    );
    this.onConditionChange(this.condition);
  }

  private addSubgroupToGroup(group: ConditionGroup) {
    const subgroup = createConditionGroup(ConditionOperator.AND);

    const firstTarget = this.targets[0];
    if (firstTarget) {
      const defaultValue =
        firstTarget.type === 'boolean'
          ? false
          : firstTarget.type === 'number'
            ? 0
            : firstTarget.type === 'choice' && firstTarget.choices?.length
              ? firstTarget.choices[0].id
              : '';

      subgroup.conditions.push(
        createComparisonCondition(
          firstTarget.ref,
          ComparisonOperator.EQUALS,
          defaultValue,
        ),
      );
    }

    group.conditions.push(subgroup);
    this.onConditionChange(this.condition);
  }

  private removeConditionFromGroup(group: ConditionGroup, index: number) {
    group.conditions.splice(index, 1);

    // If group is empty and is the root condition, remove the condition entirely
    if (group.conditions.length === 0 && group === this.condition) {
      this.condition = undefined;
      this.onConditionChange(undefined);
    } else {
      this.onConditionChange(this.condition);
    }
  }

  private updateComparisonTarget(
    condition: ComparisonCondition,
    targetKey: string,
  ) {
    // Find the target that matches this key
    const target = this.targets.find((t) => {
      const tKey = `${t.ref.stageId}::${t.ref.questionId}`;
      return tKey === targetKey;
    });

    if (target) {
      condition.target = target.ref;

      // Reset value when target changes
      condition.value =
        target.type === 'boolean'
          ? false
          : target.type === 'number'
            ? 0
            : target.type === 'choice' && target.choices?.length
              ? target.choices[0].id
              : '';
    }

    this.onConditionChange(this.condition);
  }

  // Helper to parse target ID strings into structured references
  private updateComparisonOperator(
    condition: ComparisonCondition,
    operator: ComparisonOperator,
  ) {
    condition.operator = operator;
    this.onConditionChange(this.condition);
  }

  private updateComparisonValue(
    condition: ComparisonCondition,
    value: string | number | boolean,
  ) {
    condition.value = value;
    this.onConditionChange(this.condition);
  }
}

/** Helper to convert survey questions to condition targets */
export function surveyQuestionsToConditionTargets(
  questions: SurveyQuestion[],
  stageId: string,
  stageName?: string,
): ConditionTarget[] {
  return questions.map((q) => {
    let type: ConditionTarget['type'] = 'text';
    let choices: ConditionTarget['choices'] = undefined;

    switch (q.kind) {
      case SurveyQuestionKind.TEXT:
        type = 'text';
        break;
      case SurveyQuestionKind.CHECK:
        type = 'boolean';
        break;
      case SurveyQuestionKind.SCALE:
        type = 'number';
        break;
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        type = 'choice';
        const mcQuestion = q as MultipleChoiceSurveyQuestion;
        choices = mcQuestion.options.map((opt) => ({
          id: opt.id,
          label: opt.text || `Option ${opt.id}`,
        }));
        break;
    }

    // Create structured reference
    const ref: ConditionTargetReference = {
      stageId: stageId,
      questionId: q.id,
    };

    const label = q.questionTitle || `Question ${q.id}`;

    return {
      ref,
      label,
      type,
      choices,
      stageName,
    };
  });
}
