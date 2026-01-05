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
  ConditionTarget,
  ConditionTargetReference,
  createConditionGroup,
  createComparisonCondition,
  getComparisonOperatorLabel,
} from '@deliberation-lab/utils';

import {styles} from './condition_editor.scss';

/** Reusable condition editor component */
@customElement('condition-editor')
export class ConditionEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property({type: Object}) condition: Condition | undefined = undefined;
  @property({type: Array}) targets: ConditionTarget[] = [];
  @property({type: Boolean}) disabled: boolean = false;
  @property() onConditionChange: (condition: Condition | undefined) => void =
    () => {};

  override render() {
    const hasCondition = this.condition !== undefined;

    return html`
      <div class="condition-editor ${this.disabled ? 'disabled' : ''}">
        <div class="header">
          <div class="title">Display Condition</div>
          ${hasCondition
            ? html`
                <md-text-button @click=${this.removeCondition}>
                  <md-icon slot="icon">delete</md-icon>
                  Remove all
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
        <div class="group-conditions">
          ${group.conditions.length === 0
            ? html`
                <div class="empty-conditions">
                  No conditions added yet. Click "Add condition" below.
                </div>
              `
            : group.conditions.map(
                (c, index) => html`
                  ${index > 0
                    ? html`
                        <div class="operator-connector">
                          <div class="connector-line"></div>
                          <div class="operator-split-button">
                            <button
                              class="operator-option ${group.operator ===
                              ConditionOperator.AND
                                ? 'active'
                                : ''}"
                              @click=${() =>
                                this.updateGroupOperator(
                                  group,
                                  ConditionOperator.AND,
                                )}
                              title="All conditions must be true"
                            >
                              AND
                            </button>
                            <button
                              class="operator-option ${group.operator ===
                              ConditionOperator.OR
                                ? 'active'
                                : ''}"
                              @click=${() =>
                                this.updateGroupOperator(
                                  group,
                                  ConditionOperator.OR,
                                )}
                              title="Any condition must be true"
                            >
                              OR
                            </button>
                          </div>
                          <div class="connector-line"></div>
                        </div>
                      `
                    : nothing}
                  <div class="condition-item">
                    ${this.renderCondition(c)}
                    <div class="condition-actions">
                      ${c.type === 'group'
                        ? nothing
                        : html`
                            <md-icon-button
                              @click=${() =>
                                this.insertSubgroupAfter(group, index)}
                              title="Add subgroup after this condition"
                            >
                              <md-icon>add_circle</md-icon>
                            </md-icon-button>
                          `}
                      <md-icon-button
                        @click=${() =>
                          this.removeConditionFromGroup(group, index)}
                        title="Remove this condition"
                      >
                        <md-icon>delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>
                `,
              )}
        </div>
        <div class="group-actions">
          <md-text-button @click=${() => this.addComparisonToGroup(group)}>
            <md-icon slot="icon">add</md-icon>
            Add condition
          </md-text-button>
          <md-text-button @click=${() => this.addSubgroupToGroup(group)}>
            <md-icon slot="icon">add_circle</md-icon>
            Add subgroup
          </md-text-button>
        </div>
      </div>
    `;
  }

  private getTargetKey(ref: ConditionTargetReference): string {
    return `${ref.stageId}::${ref.questionId}`;
  }

  private renderComparisonCondition(condition: ComparisonCondition) {
    const conditionKey = this.getTargetKey(condition.target);
    const target = this.targets.find(
      (t) => this.getTargetKey(t.ref) === conditionKey,
    );

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
          ${this.targets.map(
            (t) => html`
              <md-select-option value=${this.getTargetKey(t.ref)}>
                <div slot="headline">
                  ${t.stageName ? `[${t.stageName}] ${t.label}` : t.label}
                </div>
              </md-select-option>
            `,
          )}
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

  private getDefaultValue(target: ConditionTarget): string | number | boolean {
    switch (target.type) {
      case 'boolean':
        return false;
      case 'number':
        return 0;
      case 'choice':
        return target.choices?.length ? target.choices[0].id : '';
      case 'text':
      default:
        return '';
    }
  }

  private createDefaultComparison(): ComparisonCondition | null {
    const firstTarget = this.targets[0];
    if (!firstTarget) return null;

    return createComparisonCondition(
      firstTarget.ref,
      ComparisonOperator.EQUALS,
      this.getDefaultValue(firstTarget),
    );
  }

  private addCondition() {
    // Always start with a group containing one comparison
    const comparison = this.createDefaultComparison();
    const conditions = comparison ? [comparison] : [];

    this.condition = createConditionGroup(ConditionOperator.AND, conditions);
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
    const comparison = this.createDefaultComparison();
    if (comparison) {
      group.conditions.push(comparison);
      this.onConditionChange(this.condition);
    }
  }

  private createSubgroupWithComparison(): ConditionGroup {
    const comparison = this.createDefaultComparison();
    const conditions = comparison ? [comparison] : [];
    return createConditionGroup(ConditionOperator.AND, conditions);
  }

  private addSubgroupToGroup(group: ConditionGroup) {
    group.conditions.push(this.createSubgroupWithComparison());
    this.onConditionChange(this.condition);
  }

  private insertSubgroupAfter(group: ConditionGroup, index: number) {
    group.conditions.splice(index + 1, 0, this.createSubgroupWithComparison());
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
    const target = this.targets.find(
      (t) => this.getTargetKey(t.ref) === targetKey,
    );

    if (target) {
      condition.target = target.ref;
      condition.value = this.getDefaultValue(target);
    }

    this.onConditionChange(this.condition);
  }

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
