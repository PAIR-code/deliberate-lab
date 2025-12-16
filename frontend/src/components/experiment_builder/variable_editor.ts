import '../../pair-components/textarea';
import '../../pair-components/tooltip';
import '../../pair-components/icon';
import '../../pair-components/icon_button';

import '@material/web/button/outlined-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/switch/switch.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement} from 'lit/decorators.js';
import {toJS} from 'mobx';
import {Type, type TSchema} from '@sinclair/typebox';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  type BalancedAssignmentVariableConfig,
  type MultiValueVariableConfigType,
  type StaticVariableConfig,
  type VariableConfig,
  BalanceAcross,
  BalanceStrategy,
  VariableConfigType,
  VariableScope,
  createBalancedAssignmentVariableConfig,
  createRandomPermutationVariableConfig,
  createStaticVariableConfig,
  getVariableConfigTypeDescription,
  validateVariableValue,
  sanitizeVariableName,
  createShuffleConfig,
  mapScopeToSeedStrategy,
  isMultiValueConfig,
  addPropertyToSchema,
  createSchemaForType,
  getDefaultValue,
  removePropertyFromSchema,
  safeParseJson,
  serializeForInput,
  setValueAtPath,
  updateArrayItem,
  updateObjectProperty,
  updatePropertyInSchema,
  updateSchemaForConfig,
  setValueForConfig,
  renamePropertyForConfig,
  extractVariablesFromVariableConfigs,
  findUnusedVariables,
} from '@deliberation-lab/utils';

import {styles} from './variable_editor.scss';

/** Experiment variable editor with full schema and value editing. */
@customElement('variable-editor')
export class VariableEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    const variableConfigs =
      this.experimentEditor.experiment?.variableConfigs ?? [];

    return html`
      <div class="inner-wrapper">
        <div class="title">Variables</div>
        <p>
          Any variables configured below can be referenced in stage descriptions
          via
          <a
            href="https://mustache.github.io/mustache.5.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mustache templating</a
          >, e.g., {{my_variable}}.
          <a
            href="https://pair-code.github.io/deliberate-lab/features/variables"
            target="_blank"
            >See documentation</a
          >.
        </p>
        ${this.renderUnusedVariablesWarning()}
        ${variableConfigs.map((config: VariableConfig, i: number) =>
          this.renderVariableConfig(config, i),
        )}
        <md-outlined-button
          @click=${() =>
            this.experimentEditor.addVariableConfig(
              createRandomPermutationVariableConfig(),
            )}
        >
          <pr-icon icon="add" slot="icon"></pr-icon>
          Add new variable config
        </md-outlined-button>
      </div>
    `;
  }

  private renderUnusedVariablesWarning() {
    const variableConfigs =
      this.experimentEditor.experiment?.variableConfigs ?? [];
    const stages = this.experimentEditor.stages ?? [];
    const agentMediators = this.experimentEditor.agentMediators ?? [];
    const agentParticipants = this.experimentEditor.agentParticipants ?? [];

    if (variableConfigs.length === 0) {
      return nothing;
    }

    const variableDefinitions =
      extractVariablesFromVariableConfigs(variableConfigs);
    // Search for variable usage in stages and all agent prompts
    const allContentJson = JSON.stringify({
      stages,
      agentMediators,
      agentParticipants,
    });
    const unusedVariables = findUnusedVariables(
      allContentJson,
      variableDefinitions,
    );

    if (unusedVariables.length === 0) {
      return nothing;
    }

    return html`
      <div class="validation-error">
        ⚠️ Unused variables: ${unusedVariables.join(', ')}
      </div>
    `;
  }

  // ===== Variable Config =====

  private renderVariableConfig(config: VariableConfig, index: number) {
    return html`
      <div class="variable-config">
        <div class="config-header">
          <span class="config-title">Variable Config ${index + 1}</span>
          <pr-icon-button
            icon="delete"
            color="error"
            variant="default"
            @click=${() => this.deleteVariableConfig(index)}
          >
          </pr-icon-button>
        </div>
        <div class="config-content">
          ${this.renderSection(
            'Configuration type',
            html`
              <select
                @change=${(e: Event) => {
                  const newType = (e.target as HTMLSelectElement)
                    .value as VariableConfigType;
                  this.changeConfigType(config, index, newType);
                }}
              >
                <option
                  value="${VariableConfigType.STATIC}"
                  ?selected=${config.type === VariableConfigType.STATIC}
                >
                  Static
                </option>
                <option
                  value="${VariableConfigType.RANDOM_PERMUTATION}"
                  ?selected=${config.type ===
                  VariableConfigType.RANDOM_PERMUTATION}
                >
                  Random permutation
                </option>
                <option
                  value="${VariableConfigType.BALANCED_ASSIGNMENT}"
                  ?selected=${config.type ===
                  VariableConfigType.BALANCED_ASSIGNMENT}
                >
                  Balanced assignment
                </option>
              </select>
              <div class="description">
                ${getVariableConfigTypeDescription(config.type)}
              </div>
            `,
          )}
          ${this.renderDivider()}
          ${this.renderSection(
            'Assignment scope',
            html`
              <div class="description">
                ${config.scope === VariableScope.EXPERIMENT
                  ? 'All participants in the experiment see the same values.'
                  : config.scope === VariableScope.COHORT
                    ? 'Participants in the same cohort see the same values.'
                    : 'Each participant sees different values.'}
              </div>
              ${config.type === VariableConfigType.STATIC
                ? html`
                    <div class="static-scope">
                      <pr-icon icon="lock"></pr-icon>
                      <span>Experiment (Global)</span>
                    </div>
                  `
                : config.type === VariableConfigType.BALANCED_ASSIGNMENT
                  ? html`
                      <div class="static-scope">
                        <pr-icon icon="lock"></pr-icon>
                        <span>Participant (each gets one assignment)</span>
                      </div>
                    `
                  : html`
                      <select
                        @change=${(e: Event) => {
                          const scope = (e.target as HTMLSelectElement)
                            .value as VariableScope;

                          let updates: Partial<VariableConfig> = {scope};

                          // Automatically update seed strategy based on scope for Random Permutation variables
                          if (
                            config.type ===
                              VariableConfigType.RANDOM_PERMUTATION &&
                            'shuffleConfig' in config
                          ) {
                            const seed = mapScopeToSeedStrategy(scope);
                            updates = {
                              ...updates,
                              shuffleConfig: createShuffleConfig({
                                ...config.shuffleConfig,
                                seed,
                              }),
                            };
                          }

                          this.updateConfig(config, index, updates);
                        }}
                      >
                        <option
                          value="${VariableScope.EXPERIMENT}"
                          ?selected=${config.scope === VariableScope.EXPERIMENT}
                        >
                          Experiment
                        </option>
                        <option
                          value="${VariableScope.COHORT}"
                          ?selected=${config.scope === VariableScope.COHORT}
                        >
                          Cohort
                        </option>
                        <option
                          value="${VariableScope.PARTICIPANT}"
                          ?selected=${config.scope ===
                          VariableScope.PARTICIPANT}
                        >
                          Participant
                        </option>
                      </select>
                    `}
            `,
          )}
          ${this.renderDivider()}
          ${this.renderSection(
            'Variable Definition',
            html`
              <div class="description">
                Define the variable name, description, and schema
              </div>
              <div class="config-section">
                <label class="property-label">Variable name</label>
                <pr-textarea
                  placeholder="e.g., charities"
                  .value=${config.definition.name}
                  variant="outlined"
                  @input=${(e: Event) => {
                    const input = e.target as HTMLTextAreaElement;
                    const name = sanitizeVariableName(input.value);
                    if (input.value !== name) {
                      input.value = name;
                    }
                    this.updateDefinition(config, index, {name});
                  }}
                ></pr-textarea>
                ${!config.definition.name.trim()
                  ? html`<div class="validation-error">
                      ⚠️ Variable name is required.
                    </div>`
                  : this.hasDuplicateName(config, index)
                    ? html`<div class="validation-error">
                        ⚠️ A variable with this name already exists.
                      </div>`
                    : nothing}
              </div>
              <div class="config-section">
                <label class="property-label">Description</label>
                <pr-textarea
                  placeholder="e.g., List of charities for allocation"
                  .value=${config.definition.description}
                  variant="outlined"
                  @input=${(e: Event) =>
                    this.updateDefinition(config, index, {
                      description: (e.target as HTMLTextAreaElement).value,
                    })}
                ></pr-textarea>
              </div>
              <div class="config-section">
                <label class="property-label">Schema</label>
                ${this.renderSchemaEditor(config, index)}
              </div>
            `,
          )}
          ${config.type === VariableConfigType.STATIC
            ? html`
                ${this.renderDivider()}
                ${this.renderSection(
                  'Static Value',
                  html`
                    <div class="description">
                      Define the single value assigned to all
                      participants/cohorts
                    </div>
                    ${this.renderStaticValueEditor(config, index)}
                  `,
                )}
              `
            : config.type === VariableConfigType.RANDOM_PERMUTATION
              ? html`
                  ${this.renderDivider()}
                  ${this.renderSection(
                    'Output Format',
                    html`
                      <div class="description">
                        ${(config.expandListToSeparateVariables ?? true)
                          ? html`Creates separate variables. Access via
                              <code>{{${config.definition.name}_1}}</code>,
                              <code>{{${config.definition.name}_2}}</code>, etc.`
                          : html`Creates a single array variable. Access
                              individual values via
                              <code>{{${config.definition.name}.0}}</code>,
                              <code>{{${config.definition.name}.1}}</code>, etc.`}
                      </div>
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          .checked=${config.expandListToSeparateVariables ??
                          true}
                          @change=${(e: Event) => {
                            this.updateConfig(config, index, {
                              expandListToSeparateVariables: (
                                e.target as HTMLInputElement
                              ).checked,
                            });
                          }}
                        />
                        <span>Expand to separate variables</span>
                      </label>
                    `,
                  )}
                  ${this.renderDivider()}
                  ${this.renderSection(
                    'Selection Size',
                    html`
                      <div class="description">
                        Number of instances to select (leave empty to select all
                        and shuffle)
                      </div>
                      <div class="number-input">
                        <input
                          type="number"
                          min="1"
                          .max=${config.values.length || ''}
                          placeholder="Leave empty for all"
                          .value=${config.numToSelect ?? ''}
                          @input=${(e: Event) => {
                            const val = (e.target as HTMLInputElement).value;
                            this.updateConfig(config, index, {
                              numToSelect: val === '' ? undefined : Number(val),
                            });
                          }}
                        />
                      </div>
                      ${config.numToSelect != null &&
                      config.values.length > 0 &&
                      (config.numToSelect < 1 ||
                        config.numToSelect > config.values.length)
                        ? html`<div class="validation-error">
                            ⚠️ Selection size must be between 1 and
                            ${config.values.length}
                          </div>`
                        : nothing}
                    `,
                  )}
                  ${this.renderDivider()}
                  ${this.renderSection(
                    'Values to choose from',
                    html`
                      <div class="description">
                        Define the pool of values to select from
                      </div>
                      <div class="items-list">
                        ${config.values.map((jsonValue: string, i: number) =>
                          this.renderValueEditor(config, index, jsonValue, i),
                        )}
                      </div>
                      <button
                        class="add-button"
                        @click=${() =>
                          this.updateConfig(config, index, {
                            values: [...config.values, ''],
                          })}
                      >
                        <pr-icon icon="add"></pr-icon>
                        <span>Add value</span>
                      </button>
                      ${config.values.length === 0
                        ? html`<div class="validation-error">
                            ⚠️ At least one value is required.
                          </div>`
                        : nothing}
                    `,
                  )}
                `
              : html`
                  ${this.renderDivider()}
                  ${this.renderBalancedAssignmentSettings(
                    config as BalancedAssignmentVariableConfig,
                    index,
                  )}
                `}
        </div>
      </div>
    `;
  }

  private renderBalancedAssignmentSettings(
    config: BalancedAssignmentVariableConfig,
    index: number,
  ) {
    return html`
      ${this.renderSection(
        'Balance Strategy',
        html`
          <div class="description">
            How participants are assigned to conditions
          </div>
          <select
            @change=${(e: Event) => {
              const strategy = (e.target as HTMLSelectElement)
                .value as BalanceStrategy;
              this.updateConfig(config, index, {balanceStrategy: strategy});
            }}
          >
            <option
              value="${BalanceStrategy.ROUND_ROBIN}"
              ?selected=${config.balanceStrategy ===
              BalanceStrategy.ROUND_ROBIN}
            >
              Round Robin
            </option>
            <option
              value="${BalanceStrategy.RANDOM}"
              ?selected=${config.balanceStrategy === BalanceStrategy.RANDOM}
            >
              Random
            </option>
          </select>
          <div class="description">
            ${config.balanceStrategy === BalanceStrategy.ROUND_ROBIN
              ? 'Cycles through values in order based on participant count (deterministic, perfectly balanced)'
              : 'Random selection without balancing (seeded by participant ID)'}
          </div>
        `,
      )}
      ${this.renderDivider()}
      ${this.renderSection(
        'Balance Across',
        html`
          <div class="description">
            Whether to balance across the entire experiment or within each
            cohort
          </div>
          <select
            @change=${(e: Event) => {
              const balanceAcross = (e.target as HTMLSelectElement)
                .value as BalanceAcross;
              this.updateConfig(config, index, {balanceAcross});
            }}
          >
            <option
              value="${BalanceAcross.EXPERIMENT}"
              ?selected=${config.balanceAcross === BalanceAcross.EXPERIMENT}
            >
              Experiment-wide
            </option>
            <option
              value="${BalanceAcross.COHORT}"
              ?selected=${config.balanceAcross === BalanceAcross.COHORT}
            >
              Per-cohort
            </option>
          </select>
          <div class="description">
            ${config.balanceAcross === BalanceAcross.EXPERIMENT
              ? 'Balances across all participants in the experiment'
              : 'Balances within each cohort independently'}
          </div>
        `,
      )}
      ${this.renderDivider()}
      ${this.renderSection(
        'Condition Values & Weights',
        html`
          <div class="description">
            Define the values (conditions) to assign. Each participant will
            receive exactly one value. Optionally set weights to control the
            distribution (e.g., weights 2:1 means ~67% get first value, ~33% get
            second).
          </div>
          <div class="items-list">
            ${config.values.map((jsonValue: string, i: number) =>
              this.renderWeightedValueEditor(config, index, jsonValue, i),
            )}
          </div>
          <button
            class="add-button"
            @click=${() => {
              const newValues = [...config.values, ''];
              const newWeights = config.weights
                ? [...config.weights, 1]
                : undefined;
              this.updateConfig(config, index, {
                values: newValues,
                weights: newWeights,
              });
            }}
          >
            <pr-icon icon="add"></pr-icon>
            <span>Add condition</span>
          </button>
          ${config.values.length < 2
            ? html`<div class="validation-error">
                ⚠️ At least two conditions are required for balanced assignment.
              </div>`
            : nothing}
          ${config.weights && config.weights.length !== config.values.length
            ? html`<div class="validation-error">
                ⚠️ Number of weights must match number of values.
              </div>`
            : nothing}
        `,
      )}
    `;
  }

  private changeConfigType(
    config: VariableConfig,
    index: number,
    newType: VariableConfigType,
  ) {
    if (newType === config.type) return;

    // Configs either store a single value ('value') or multiple values ('values').
    // When converting between formats, we need to combine or split the values.
    // Schema stays as Array(ItemType) - single-value configs store the whole array
    // as one JSON string, multi-value configs store each item separately.

    // Extract current data in a normalized form
    let value = '';
    let values: string[] = [];

    if ('value' in config && typeof config.value === 'string') {
      value = config.value;
      // Split single value (JSON array) into multiple values
      const parsed = safeParseJson(value, []);
      values = Array.isArray(parsed)
        ? parsed.map((item: unknown) => JSON.stringify(item))
        : [];
    } else if ('values' in config && Array.isArray(config.values)) {
      values = config.values;
      // Combine multiple values into single value (JSON array)
      const parsedValues = values.map((v: string) => safeParseJson(v, v));
      value = JSON.stringify(parsedValues);
    }

    // Create new config based on target type
    switch (newType) {
      case VariableConfigType.STATIC:
        this.experimentEditor.updateVariableConfig(
          createStaticVariableConfig({
            id: config.id,
            scope: config.scope,
            definition: config.definition,
            value,
          }),
          index,
        );
        break;
      case VariableConfigType.RANDOM_PERMUTATION:
        this.experimentEditor.updateVariableConfig(
          createRandomPermutationVariableConfig({
            id: config.id,
            scope: config.scope,
            definition: config.definition,
            values,
          }),
          index,
        );
        break;
      case VariableConfigType.BALANCED_ASSIGNMENT:
        this.experimentEditor.updateVariableConfig(
          createBalancedAssignmentVariableConfig({
            id: config.id,
            // Balanced assignment is always participant-scoped
            definition: config.definition,
            values,
          }),
          index,
        );
        break;
    }
  }

  private updateConfig(
    config: VariableConfig,
    index: number,
    updates: Partial<VariableConfig>,
  ) {
    this.experimentEditor.updateVariableConfig(
      {...config, ...updates} as VariableConfig,
      index,
    );
  }

  private updateDefinition(
    config: VariableConfig,
    index: number,
    updates: Partial<typeof config.definition>,
  ) {
    this.updateConfig(config, index, {
      definition: {...config.definition, ...updates},
    });
  }

  private deleteVariableConfig(index: number) {
    if (!confirm('Delete this variable config?')) return;
    const exp = this.experimentEditor.experiment;
    if (!exp?.variableConfigs) return;
    exp.variableConfigs = [
      ...exp.variableConfigs.slice(0, index),
      ...exp.variableConfigs.slice(index + 1),
    ];
  }

  private hasDuplicateName(config: VariableConfig, index: number): boolean {
    const configs = this.experimentEditor.experiment?.variableConfigs ?? [];
    return configs.some(
      (other, i) =>
        i !== index &&
        other.definition.name.trim() === config.definition.name.trim() &&
        config.definition.name.trim() !== '',
    );
  }

  // ===== Schema Editor =====

  private renderSchemaEditor(config: VariableConfig, configIndex: number) {
    // IMPORTANT: Use toJS to strip MobX observability from TypeBox schemas.
    // TypeBox schemas have circular references. When MobX makes them observable,
    // TypeBox's traversal hits infinite recursion through the MobX proxies → stack overflow.
    // toJS converts to plain objects, breaking the cycle. This is safe because:
    // 1. We only read schemas for rendering (no reactivity needed on schema properties)
    // 2. Updates create new plain schemas that get stored (and re-made observable by MobX)
    // 3. The next render will toJS again, so we always work with plain copies
    const schema = toJS(config.definition.schema) as unknown as TSchema;
    return html`
      <div class="schema-editor">
        ${this.renderSchemaType(schema, '', config, configIndex)}
      </div>
    `;
  }

  private renderSchemaType(
    schema: TSchema,
    path: string,
    config: VariableConfig,
    configIndex: number,
    /** Set to true after unwrapping the root array for multi-value configs */
    rootArrayUnwrapped = false,
  ): TemplateResult {
    const isMultiValueAtRoot = isMultiValueConfig(config.type) && path === '';

    // For multi-value configs at root, extract item schema and show it directly.
    // Users work with individual items, not the array wrapper.
    // Only do this once (check rootArrayUnwrapped to prevent over-extraction for nested arrays).
    if (
      isMultiValueAtRoot &&
      !rootArrayUnwrapped &&
      'items' in schema &&
      schema.items
    ) {
      const itemSchema = schema.items as TSchema;
      return this.renderSchemaType(itemSchema, path, config, configIndex, true);
    }

    const type = schema.type as string;

    return html`
      <div class="schema-type-editor ${path ? 'nested' : ''}">
        <div class="type-selector">
          <label>Type:</label>
          <select
            .value=${type}
            @change=${(e: Event) => {
              const newLocalSchema = createSchemaForType(
                (e.target as HTMLSelectElement).value,
              );
              const newFullSchema = updateSchemaForConfig(
                config,
                path,
                newLocalSchema,
              );
              this.updateSchemaAndResetValues(
                config,
                configIndex,
                newFullSchema,
                path,
                getDefaultValue(newLocalSchema),
              );
            }}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
        </div>
        ${type === 'object'
          ? this.renderObjectSchema(schema, path, config, configIndex)
          : nothing}
        ${type === 'array'
          ? this.renderArraySchema(schema, path, config, configIndex)
          : nothing}
      </div>
    `;
  }

  private renderObjectSchema(
    schema: TSchema,
    path: string,
    config: VariableConfig,
    configIndex: number,
  ): TemplateResult {
    const props = ('properties' in schema ? schema.properties : {}) as Record<
      string,
      TSchema
    >;
    const propNames = Object.keys(props);

    return html`
      <div class="nested-editor">
        <div class="nested-header">
          <strong>Properties:</strong>
          <button
            class="add-button"
            @click=${() =>
              this.handleAddProperty(props, path, config, configIndex)}
          >
            <pr-icon icon="add"></pr-icon>
            <span>Add property</span>
          </button>
        </div>
        ${propNames.length === 0
          ? html`<div class="empty-message">No properties</div>`
          : propNames.map((name) =>
              this.renderPropertyItem(
                name,
                props[name],
                props,
                path,
                config,
                configIndex,
              ),
            )}
      </div>
    `;
  }

  private renderArraySchema(
    schema: TSchema,
    path: string,
    config: VariableConfig,
    configIndex: number,
  ): TemplateResult {
    const items = (
      'items' in schema && schema.items ? schema.items : Type.String()
    ) as TSchema;
    const itemType = items.type as string;

    return html`
      <div class="nested-editor">
        <div class="nested-header">
          <strong>Array items:</strong>
          <select
            .value=${itemType}
            @change=${(e: Event) => {
              const newItemSchema = createSchemaForType(
                (e.target as HTMLSelectElement).value,
              );
              const newArraySchema = Type.Array(newItemSchema);
              const newFullSchema = updateSchemaForConfig(
                config,
                path,
                newArraySchema,
              );
              this.updateSchemaAndResetValues(
                config,
                configIndex,
                newFullSchema,
                path,
                getDefaultValue(newItemSchema),
              );
            }}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
        </div>
        ${itemType === 'object'
          ? this.renderObjectSchema(items, path, config, configIndex)
          : nothing}
        ${
          /* NOTE: Deeply nested arrays (3+ levels) may not update correctly
            because path doesn't change when entering array items. If needed,
            add [] notation to paths (e.g., 'prop.[].[].field') and handle
            in updateSchemaAtPath. */ ''
        }
        ${itemType === 'array'
          ? this.renderArraySchema(items, path, config, configIndex)
          : nothing}
      </div>
    `;
  }

  private resetValuesAtPath(
    config: VariableConfig,
    newFullSchema: TSchema,
    path: string,
    defaultValue: unknown,
  ): Partial<VariableConfig> {
    // Handle single value configs (Static)
    if ('value' in config && typeof config.value === 'string') {
      const parsed = safeParseJson(config.value, {});
      const updatedValue = path
        ? setValueAtPath(parsed, newFullSchema, path, defaultValue)
        : defaultValue;
      return {
        value: JSON.stringify(updatedValue),
      };
    }

    // Handle multi-value configs (RandomPermutation, BalancedAssignment)
    // Each value is a single item, so we use the helper which operates on item schema
    if ('values' in config && Array.isArray(config.values)) {
      const updatedValues = config.values.map((jsonValue: string) => {
        const parsed = safeParseJson(jsonValue, {});
        const updatedValue = path
          ? setValueForConfig(parsed, config, path, defaultValue)
          : defaultValue;
        return JSON.stringify(updatedValue);
      });
      return {values: updatedValues};
    }

    return {};
  }

  private updateSchemaAndResetValues(
    config: VariableConfig,
    configIndex: number,
    newFullSchema: TSchema,
    path: string,
    defaultValue: unknown,
  ) {
    const valueUpdates = this.resetValuesAtPath(
      config,
      newFullSchema,
      path,
      defaultValue,
    );
    this.updateConfig(config, configIndex, {
      definition: {
        ...config.definition,
        schema: newFullSchema as unknown as typeof config.definition.schema,
      },
      ...valueUpdates,
    });
  }

  private handlePropertyRename(
    input: HTMLInputElement,
    oldName: string,
    newName: string,
    propSchema: TSchema,
    props: Record<string, TSchema>,
    path: string,
    config: VariableConfig,
    configIndex: number,
  ) {
    // Sanitize the new name
    newName = sanitizeVariableName(newName);

    if (!newName || newName === oldName) {
      // Reset to original name if empty or no change after sanitization
      input.value = oldName;
      return;
    }

    // Check for duplicate property names
    if (newName in props) {
      alert(
        `Property "${newName}" already exists. Please choose a different name.`,
      );
      input.value = oldName;
      return;
    }

    // Update input to show sanitized value
    input.value = newName;

    // We need to update both schema AND values atomically
    // Don't use onUpdate - it only updates the schema
    // Instead, manually construct the full new schema and update everything at once

    // First, build the new object schema with renamed property (preserving order)
    const newProps: Record<string, TSchema> = {};
    for (const key of Object.keys(props)) {
      if (key === oldName) {
        newProps[newName] = propSchema;
      } else {
        newProps[key] = props[key];
      }
    }
    const newObjSchema = Type.Object(newProps);

    // Update schema at the right path
    const updatedFullSchema = updateSchemaForConfig(config, path, newObjSchema);

    // Rename property in values
    const oldPropPath = path ? `${path}.${oldName}` : oldName;

    // Update both schema and values in a single call
    if (config.type === VariableConfigType.STATIC) {
      const parsed = safeParseJson(config.value, {});
      const updated = renamePropertyForConfig(
        parsed,
        config,
        oldPropPath,
        newName,
      );
      this.updateConfig(config, configIndex, {
        definition: {
          ...config.definition,
          schema:
            updatedFullSchema as unknown as typeof config.definition.schema,
        },
        value: JSON.stringify(updated),
      });
    } else if (isMultiValueConfig(config)) {
      // Type guard narrows config to MultiValueVariableConfig
      const updatedValues = config.values.map((jsonValue: string) => {
        const parsed = safeParseJson(jsonValue, {});
        const updated = renamePropertyForConfig(
          parsed,
          config,
          oldPropPath,
          newName,
        );
        return JSON.stringify(updated);
      });
      this.updateConfig(config, configIndex, {
        definition: {
          ...config.definition,
          schema:
            updatedFullSchema as unknown as typeof config.definition.schema,
        },
        values: updatedValues,
      });
    }
  }

  private renderPropertyItem(
    name: string,
    propSchema: TSchema,
    props: Record<string, TSchema>,
    path: string,
    config: VariableConfig,
    configIndex: number,
  ) {
    const propType = propSchema.type as string;
    const isComplex = propType === 'object' || propType === 'array';

    const header = html`
      <div class="property-header-content">
        <input
          class="property-name-input"
          type="text"
          .value=${name}
          @blur=${(e: Event) => {
            const input = e.target as HTMLInputElement;
            const newName = input.value.trim();
            this.handlePropertyRename(
              input,
              name,
              newName,
              propSchema,
              props,
              path,
              config,
              configIndex,
            );
          }}
          placeholder="property name"
        />
        <select
          .value=${propType}
          @change=${(e: Event) => {
            const newPropSchema = createSchemaForType(
              (e.target as HTMLSelectElement).value,
            );
            const newObjSchema = updatePropertyInSchema(
              props,
              name,
              newPropSchema,
            );
            const newFullSchema = updateSchemaForConfig(
              config,
              path,
              newObjSchema,
            );
            const propPath = path ? `${path}.${name}` : name;
            this.updateSchemaAndResetValues(
              config,
              configIndex,
              newFullSchema,
              propPath,
              getDefaultValue(newPropSchema),
            );
          }}
          @click=${(e: Event) => e.stopPropagation()}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="object">Object</option>
          <option value="array">Array</option>
        </select>
      </div>
    `;

    if (!isComplex) {
      return html`
        <div class="property-item">
          <div class="property-header">
            ${header}
            <pr-icon-button
              icon="delete"
              color="error"
              variant="default"
              @click=${() => {
                if (!confirm(`Remove property "${name}"?`)) return;
                const newObjSchema = removePropertyFromSchema(props, name);
                const newFullSchema = updateSchemaForConfig(
                  config,
                  path,
                  newObjSchema,
                );
                this.updateDefinition(config, configIndex, {
                  schema:
                    newFullSchema as unknown as typeof config.definition.schema,
                });
              }}
            >
            </pr-icon-button>
          </div>
        </div>
      `;
    }

    const content = html`
      ${propType === 'object'
        ? this.renderObjectSchema(
            propSchema,
            `${path}.${name}`,
            config,
            configIndex,
          )
        : nothing}
      ${propType === 'array'
        ? this.renderArraySchema(
            propSchema,
            `${path}.${name}`,
            config,
            configIndex,
          )
        : nothing}
    `;

    return this.renderCollapsibleItem(
      header,
      () => {
        if (!confirm(`Remove property "${name}"?`)) return;
        const newObjSchema = removePropertyFromSchema(props, name);
        const newFullSchema = updateSchemaForConfig(config, path, newObjSchema);
        this.updateDefinition(config, configIndex, {
          schema: newFullSchema as unknown as typeof config.definition.schema,
        });
      },
      content,
    );
  }

  private handleAddProperty(
    props: Record<string, TSchema>,
    path: string,
    config: VariableConfig,
    configIndex: number,
  ) {
    const rawName = prompt('Property name:');
    if (!rawName) return;

    // Sanitize the property name
    const name = sanitizeVariableName(rawName);
    if (!name) return;
    const newObjSchema = addPropertyToSchema(props, name);
    if (!newObjSchema) {
      alert('Property already exists');
      return;
    }
    const newFullSchema = updateSchemaForConfig(config, path, newObjSchema);
    // New properties default to string type with empty string value
    const propPath = path ? `${path}.${name}` : name;
    this.updateSchemaAndResetValues(
      config,
      configIndex,
      newFullSchema,
      propPath,
      getDefaultValue(createSchemaForType('string')),
    );
  }

  // ===== Static Value Editor =====

  private renderStaticValueEditor(
    config: StaticVariableConfig,
    configIndex: number,
  ) {
    // Strip MobX observability to prevent stack overflow (see renderSchemaEditor for details)
    const schema = toJS(config.definition.schema) as unknown as TSchema;
    const error = validateVariableValue(schema, config.value);

    return html`
      <div class="config-section">
        <label class="property-label">Value</label>
        ${this.renderValueInput(schema, config.value, (v) => {
          this.updateConfig(config, configIndex, {value: v});
        })}
        ${error
          ? html`<div class="validation-error">⚠️ ${error}</div>`
          : nothing}
      </div>
    `;
  }

  // ===== Value Editor (for multi-value configs) =====

  private renderValueEditor(
    config: MultiValueVariableConfigType,
    configIndex: number,
    jsonValue: string,
    valueIndex: number,
  ) {
    // Strip MobX observability to prevent stack overflow (see renderSchemaEditor for details)
    const arraySchema = toJS(config.definition.schema) as unknown as TSchema;
    // Multi-value configs store schema as Array(ItemType),
    // so extract the item schema for validation
    const itemSchema =
      'items' in arraySchema ? (arraySchema.items as TSchema) : arraySchema;
    const error = validateVariableValue(itemSchema, jsonValue);

    return this.renderCollapsibleItem(
      html`<strong>Value ${valueIndex + 1}</strong>`,
      () => {
        if (!confirm('Delete this value?')) return;
        this.updateConfig(config, configIndex, {
          values: config.values.filter((_, i) => i !== valueIndex),
        });
      },
      html`
        <div class="config-section">
          <label class="property-label">Value</label>
          ${this.renderValueInput(itemSchema, jsonValue, (v) => {
            const values = [...config.values];
            values[valueIndex] = v;
            this.updateConfig(config, configIndex, {values});
          })}
          ${error
            ? html`<div class="validation-error">⚠️ ${error}</div>`
            : nothing}
        </div>
      `,
    );
  }

  // ===== Weighted Value Editor (for BalancedAssignment with weights) =====

  private renderWeightedValueEditor(
    config: BalancedAssignmentVariableConfig,
    configIndex: number,
    jsonValue: string,
    valueIndex: number,
  ) {
    // Strip MobX observability to prevent stack overflow
    const arraySchema = toJS(config.definition.schema) as unknown as TSchema;
    const itemSchema =
      'items' in arraySchema ? (arraySchema.items as TSchema) : arraySchema;
    const error = validateVariableValue(itemSchema, jsonValue);

    const weight = config.weights?.[valueIndex] ?? 1;
    const hasWeights = config.weights && config.weights.length > 0;

    return this.renderCollapsibleItem(
      html`<strong>Condition ${valueIndex + 1}</strong> ${hasWeights
          ? html`<span class="weight-badge">(weight: ${weight})</span>`
          : nothing}`,
      () => {
        if (!confirm('Delete this condition?')) return;
        const newValues = config.values.filter((_, i) => i !== valueIndex);
        const newWeights = config.weights
          ? config.weights.filter((_, i) => i !== valueIndex)
          : undefined;
        this.updateConfig(config, configIndex, {
          values: newValues,
          weights: newWeights,
        });
      },
      html`
        <div class="config-section">
          <label class="property-label">Weight (optional)</label>
          <div class="description">
            Higher weights mean more participants receive this value. Leave all
            weights equal for balanced distribution.
          </div>
          <input
            type="number"
            min="1"
            step="1"
            .value=${String(weight)}
            @input=${(e: Event) => {
              const newWeight =
                parseInt((e.target as HTMLInputElement).value) || 1;
              const weights = config.weights
                ? [...config.weights]
                : config.values.map(() => 1);
              weights[valueIndex] = Math.max(1, newWeight);
              this.updateConfig(config, configIndex, {weights});
            }}
          />
        </div>
        <div class="config-section">
          <label class="property-label">Value</label>
          ${this.renderValueInput(itemSchema, jsonValue, (v) => {
            const values = [...config.values];
            values[valueIndex] = v;
            this.updateConfig(config, configIndex, {values});
          })}
          ${error
            ? html`<div class="validation-error">⚠️ ${error}</div>`
            : nothing}
        </div>
      `,
    );
  }

  private renderValueInput(
    schema: TSchema,
    value: string,
    onUpdate: (value: string) => void,
  ): TemplateResult {
    const type = schema.type as string;

    // Primitives use simple inputs
    if (type === 'string' || type === 'number') {
      return html`
        <pr-textarea
          placeholder="Enter ${type} value"
          .value=${value}
          variant="outlined"
          @input=${(e: Event) =>
            onUpdate((e.target as HTMLTextAreaElement).value)}
        ></pr-textarea>
      `;
    }

    if (type === 'boolean') {
      const isTrue = value === 'true';
      return html`
        <div class="boolean-switch">
          <span class="switch-label">false</span>
          <md-switch
            ?selected=${isTrue}
            @change=${(e: Event) => {
              const target = e.target as HTMLElement & {selected: boolean};
              onUpdate(target.selected ? 'true' : 'false');
            }}
          ></md-switch>
          <span class="switch-label">true</span>
        </div>
      `;
    }

    // Complex types
    if (type === 'object')
      return this.renderObjectValue(schema, value, onUpdate);
    if (type === 'array') return this.renderArrayValue(schema, value, onUpdate);

    return html`<div>Unknown type: ${type}</div>`;
  }

  private renderObjectValue(
    schema: TSchema,
    value: string,
    onUpdate: (value: string) => void,
  ) {
    const props = ('properties' in schema ? schema.properties : {}) as Record<
      string,
      TSchema
    >;
    const propNames = Object.keys(props);
    const parsed = safeParseJson<Record<string, unknown>>(value, {});

    return html`
      <div class="object-value-editor">
        ${propNames.length === 0
          ? html`<div class="empty-message">No properties in schema</div>`
          : propNames.map((name) => {
              const propValue = serializeForInput(props[name], parsed[name]);
              return html`
                <div class="property-editor">
                  <label class="property-label">${name}:</label>
                  ${this.renderValueInput(props[name], propValue, (v) =>
                    onUpdate(
                      updateObjectProperty(parsed, name, v, props[name]),
                    ),
                  )}
                </div>
              `;
            })}
      </div>
    `;
  }

  private renderArrayValue(
    schema: TSchema,
    value: string,
    onUpdate: (value: string) => void,
  ) {
    const itemSchema = (
      'items' in schema && schema.items ? schema.items : Type.String()
    ) as TSchema;
    const items = safeParseJson(value, []);

    return html`
      <div class="array-value-editor">
        <div class="array-header">
          <strong>Items:</strong>
          <md-text-button
            @click=${() =>
              onUpdate(JSON.stringify([...items, getDefaultValue(itemSchema)]))}
          >
            <md-icon slot="icon">add</md-icon>
            Add item
          </md-text-button>
        </div>
        ${items.length === 0
          ? html`<div class="empty-message">No items</div>`
          : items.map((item: unknown, i: number) =>
              this.renderCollapsibleItem(
                html`<span>Item ${i + 1}</span>`,
                () => {
                  if (!confirm('Remove this item?')) return;
                  onUpdate(
                    JSON.stringify(
                      items.filter((_: unknown, idx: number) => idx !== i),
                    ),
                  );
                },
                html`
                  ${this.renderValueInput(
                    itemSchema,
                    serializeForInput(itemSchema, item),
                    (v) => onUpdate(updateArrayItem(items, i, v, itemSchema)),
                  )}
                `,
              ),
            )}
      </div>
    `;
  }

  // ===== UI Helpers =====

  private renderSection(title: string, content: TemplateResult) {
    return html`
      <div class="config-section">
        <div class="section-title">${title}</div>
        ${content}
      </div>
    `;
  }

  private renderDivider() {
    return html`<div class="divider"></div>`;
  }

  private renderCollapsibleItem(
    summary: TemplateResult,
    onDelete: () => void,
    content: TemplateResult,
  ) {
    return html`
      <details class="collapsible-item" open>
        <summary class="collapsible-summary">
          ${summary}
          <pr-icon-button
            icon="delete"
            color="error"
            variant="default"
            @click=${(e: Event) => {
              e.preventDefault();
              onDelete();
            }}
          >
          </pr-icon-button>
        </summary>
        <div class="collapsible-content">${content}</div>
      </details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-editor': VariableEditor;
  }
}
