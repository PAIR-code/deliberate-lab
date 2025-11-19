import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing, TemplateResult} from 'lit';
import {customElement} from 'lit/decorators.js';
import {toJS} from 'mobx';
import {Type, type TSchema} from '@sinclair/typebox';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  SeedStrategy,
  type RandomPermutationVariableConfig,
  type StaticVariableConfig,
  type VariableConfig,
  type VariableInstance,
  VariableConfigType,
  createRandomPermutationVariableConfig,
  createStaticVariableConfig,
} from '@deliberation-lab/utils';

import {
  addPropertyToSchema,
  createSchemaForType,
  getDefaultValue,
  parseValue,
  removePropertyFromSchema,
  safeParseJson,
  serializeForInput,
  updateArrayItem,
  updateObjectProperty,
  updatePropertyInSchema,
  validateValue,
} from './variable_editor.utils';

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
            href="https://pair-code.github.io/deliberate-lab/features/variable"
            target="_blank"
            >See documentation</a
          >.
        </p>
        ${variableConfigs.map((config: VariableConfig, i: number) =>
          this.renderVariableConfig(config, i),
        )}
        <md-outlined-button
          @click=${() =>
            this.experimentEditor.addVariableConfig(
              createRandomPermutationVariableConfig(),
            )}
        >
          <md-icon slot="icon">add</md-icon>
          Add new variable config
        </md-outlined-button>
      </div>
    `;
  }

  // ===== Variable Config =====

  private renderVariableConfig(config: VariableConfig, index: number) {
    return html`
      <div class="variable-config">
        <div class="config-header">
          <span class="config-title">Variable Config ${index + 1}</span>
          <md-text-button @click=${() => this.deleteVariableConfig(index)}>
            <md-icon slot="icon">delete</md-icon>
            Delete
          </md-text-button>
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
              </select>
              <div class="description">
                ${config.type === VariableConfigType.STATIC
                  ? 'Assigns a single fixed value to all participants/cohorts'
                  : 'Randomly selects N instances from the pool and assigns to a single variable'}
              </div>
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
                  @input=${(e: Event) =>
                    this.updateDefinition(config, index, {
                      name: (e.target as HTMLTextAreaElement).value,
                    })}
                ></pr-textarea>
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
            : html`
                ${this.renderDivider()}
                ${this.renderSection(
                  'Seed strategy',
                  html`
                    <div class="description">Assignment level</div>
                    <select
                      .value=${config.seedStrategy}
                      @change=${(e: Event) =>
                        this.updateConfig(config, index, {
                          seedStrategy: (e.target as HTMLSelectElement)
                            .value as SeedStrategy,
                        })}
                    >
                      <option value="${SeedStrategy.COHORT}">cohort</option>
                      <option value="${SeedStrategy.PARTICIPANT}">
                        participant
                      </option>
                    </select>
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
                    <pr-textarea
                      placeholder="e.g., 9 (or leave empty for all)"
                      .value=${config.numToSelect?.toString() ?? ''}
                      variant="outlined"
                      @input=${(e: Event) => {
                        const val = (
                          e.target as HTMLTextAreaElement
                        ).value.trim();
                        this.updateConfig(config, index, {
                          numToSelect: val === '' ? undefined : Number(val),
                        });
                      }}
                    ></pr-textarea>
                  `,
                )}
                ${this.renderDivider()}
                ${this.renderSection(
                  'Instance Pool',
                  html`
                    <div class="description">
                      Define the pool of instances to select from
                    </div>
                    <div class="items-list">
                      ${config.values.map((instance, i: number) =>
                        this.renderInstanceEditor(config, index, instance, i),
                      )}
                    </div>
                    <md-text-button
                      @click=${() =>
                        this.updateConfig(config, index, {
                          values: [...config.values, {id: '', value: ''}],
                        })}
                    >
                      <md-icon slot="icon">add</md-icon>
                      Add instance
                    </md-text-button>
                  `,
                )}
              `}
        </div>
      </div>
    `;
  }

  private changeConfigType(
    config: VariableConfig,
    index: number,
    newType: VariableConfigType,
  ) {
    if (newType === config.type) return;

    // Determine if current config has single or multiple values
    const currentHasMultipleValues =
      'values' in config && Array.isArray(config.values);
    const currentHasSingleValue = 'value' in config;

    if (newType === VariableConfigType.STATIC) {
      // Converting to a single-value config
      // Preserve first value from multi-value configs, or existing single value
      const value = currentHasMultipleValues
        ? config.values.length > 0
          ? config.values[0]
          : {id: 'default', value: ''}
        : currentHasSingleValue
          ? config.value
          : {id: 'default', value: ''};

      const staticConfig = createStaticVariableConfig({
        id: config.id,
        definition: config.definition,
        value,
      });
      this.experimentEditor.updateVariableConfig(staticConfig, index);
    } else {
      // Converting to a multi-value config (RANDOM_PERMUTATION)
      // Preserve values from multi-value configs, or wrap single value in array
      const values = currentHasSingleValue
        ? [config.value]
        : currentHasMultipleValues
          ? config.values
          : [];

      const randomConfig = createRandomPermutationVariableConfig({
        id: config.id,
        definition: config.definition,
        seedStrategy: SeedStrategy.COHORT,
        values,
      });
      this.experimentEditor.updateVariableConfig(randomConfig, index);
    }
  }

  private updateConfig(
    config: VariableConfig,
    index: number,
    updates:
      | Partial<StaticVariableConfig>
      | Partial<RandomPermutationVariableConfig>,
  ) {
    if (config.type === VariableConfigType.STATIC) {
      this.experimentEditor.updateVariableConfig(
        {...config, ...updates} as StaticVariableConfig,
        index,
      );
    } else {
      this.experimentEditor.updateVariableConfig(
        {...config, ...updates} as RandomPermutationVariableConfig,
        index,
      );
    }
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
        ${this.renderSchemaType(
          schema,
          (s) =>
            this.updateDefinition(config, configIndex, {
              schema: s as unknown as typeof config.definition.schema,
            }),
          '',
        )}
      </div>
    `;
  }

  private renderSchemaType(
    schema: TSchema,
    onUpdate: (schema: TSchema) => void,
    path: string,
  ): TemplateResult {
    const type = schema.type as string;

    return html`
      <div class="schema-type-editor ${path ? 'nested' : ''}">
        <div class="type-selector">
          <label>Type:</label>
          <select
            .value=${type}
            @change=${(e: Event) => {
              onUpdate(
                createSchemaForType((e.target as HTMLSelectElement).value),
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
          ? this.renderObjectSchema(schema, onUpdate, path)
          : nothing}
        ${type === 'array'
          ? this.renderArraySchema(schema, onUpdate, path)
          : nothing}
      </div>
    `;
  }

  private renderObjectSchema(
    schema: TSchema,
    onUpdate: (schema: TSchema) => void,
    path: string,
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
          <md-text-button @click=${() => this.addProperty(props, onUpdate)}>
            <md-icon slot="icon">add</md-icon>
            Add property
          </md-text-button>
        </div>
        ${propNames.length === 0
          ? html`<div class="empty-message">No properties</div>`
          : propNames.map((name) =>
              this.renderPropertyItem(name, props[name], props, onUpdate, path),
            )}
      </div>
    `;
  }

  private renderArraySchema(
    schema: TSchema,
    onUpdate: (schema: TSchema) => void,
    path: string,
  ): TemplateResult {
    const items = (
      'items' in schema && schema.items ? schema.items : Type.String()
    ) as TSchema;
    const itemType = items.type as string;

    return html`
      <div class="nested-editor">
        <div class="nested-header">
          <strong>Array items:</strong>
          ${this.renderTypeSelector(itemType, (newType) => {
            const newSchema = createSchemaForType(newType);
            onUpdate(Type.Array(newSchema));
          })}
        </div>
        ${itemType === 'object'
          ? this.renderObjectSchema(
              items,
              (s) => onUpdate(Type.Array(s)),
              `${path}[]`,
            )
          : nothing}
        ${itemType === 'array'
          ? this.renderArraySchema(
              items,
              (s) => onUpdate(Type.Array(s)),
              `${path}[]`,
            )
          : nothing}
      </div>
    `;
  }

  private renderPropertyItem(
    name: string,
    propSchema: TSchema,
    props: Record<string, TSchema>,
    onUpdate: (schema: TSchema) => void,
    path: string,
  ) {
    const propType = propSchema.type as string;
    const isComplex = propType === 'object' || propType === 'array';

    const header = html`
      <div class="property-header-content">
        <span class="property-name">${name}</span>
        ${this.renderTypeSelector(propType, (newType) => {
          const newSchema = createSchemaForType(newType);
          onUpdate(updatePropertyInSchema(props, name, newSchema));
        })}
      </div>
    `;

    if (!isComplex) {
      return html`
        <div class="property-item">
          <div class="property-header">
            ${header}
            <md-icon-button
              @click=${() => {
                if (!confirm(`Remove property "${name}"?`)) return;
                onUpdate(removePropertyFromSchema(props, name));
              }}
            >
              <md-icon>delete</md-icon>
            </md-icon-button>
          </div>
        </div>
      `;
    }

    const content = html`
      ${propType === 'object'
        ? this.renderObjectSchema(
            propSchema,
            (s) => onUpdate(updatePropertyInSchema(props, name, s)),
            `${path}.${name}`,
          )
        : nothing}
      ${propType === 'array'
        ? this.renderArraySchema(
            propSchema,
            (s) => onUpdate(updatePropertyInSchema(props, name, s)),
            `${path}.${name}`,
          )
        : nothing}
    `;

    return this.renderCollapsibleItem(
      header,
      () => {
        if (!confirm(`Remove property "${name}"?`)) return;
        onUpdate(removePropertyFromSchema(props, name));
      },
      content,
    );
  }

  private renderTypeSelector(
    currentType: string,
    onTypeChange: (newType: string) => void,
  ) {
    return html`
      <select
        .value=${currentType}
        @change=${(e: Event) =>
          onTypeChange((e.target as HTMLSelectElement).value)}
        @click=${(e: Event) => e.stopPropagation()}
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="object">Object</option>
        <option value="array">Array</option>
      </select>
    `;
  }

  private addProperty(
    props: Record<string, TSchema>,
    onUpdate: (schema: TSchema) => void,
  ) {
    const name = prompt('Property name:');
    if (!name) return;
    const newSchema = addPropertyToSchema(props, name);
    if (!newSchema) {
      alert('Property already exists');
      return;
    }
    onUpdate(newSchema);
  }

  // ===== Static Value Editor =====

  private renderStaticValueEditor(
    config: StaticVariableConfig,
    configIndex: number,
  ) {
    // Strip MobX observability to prevent stack overflow (see renderSchemaEditor for details)
    const schema = toJS(config.definition.schema) as unknown as TSchema;
    const error = validateValue(schema, config.value.value);

    return html`
      <div class="config-section">
        <label class="property-label">Instance ID</label>
        <pr-textarea
          placeholder="e.g., default"
          .value=${config.value.id}
          variant="outlined"
          @input=${(e: Event) => {
            this.updateConfig(config, configIndex, {
              value: {
                ...config.value,
                id: (e.target as HTMLTextAreaElement).value,
              },
            });
          }}
        ></pr-textarea>
      </div>
      <div class="config-section">
        <label class="property-label">Value</label>
        ${this.renderValueInput(schema, config.value.value, (v) => {
          this.updateConfig(config, configIndex, {
            value: {...config.value, value: v},
          });
        })}
        ${error
          ? html`<div class="validation-error">⚠️ ${error}</div>`
          : nothing}
      </div>
    `;
  }

  // ===== Instance Editor =====

  private renderInstanceEditor(
    config: RandomPermutationVariableConfig,
    configIndex: number,
    instance: VariableInstance,
    instanceIndex: number,
  ) {
    // Strip MobX observability to prevent stack overflow (see renderSchemaEditor for details)
    const schema = toJS(config.definition.schema) as unknown as TSchema;
    const error = validateValue(schema, instance.value);

    return this.renderCollapsibleItem(
      html`<strong>Instance ${instanceIndex + 1}</strong> ${instance.id
          ? html`: <code>${instance.id}</code>`
          : nothing}`,
      () => {
        if (!confirm('Delete this instance?')) return;
        this.updateConfig(config, configIndex, {
          values: config.values.filter((_, i) => i !== instanceIndex),
        });
      },
      html`
        <div class="config-section">
          <label class="property-label">Instance ID</label>
          <pr-textarea
            placeholder="e.g., donors_choose"
            .value=${instance.id}
            variant="outlined"
            @input=${(e: Event) => {
              const values = [...config.values];
              values[instanceIndex] = {
                ...instance,
                id: (e.target as HTMLTextAreaElement).value,
              };
              this.updateConfig(config, configIndex, {values});
            }}
          ></pr-textarea>
        </div>
        <div class="config-section">
          <label class="property-label">Value</label>
          ${this.renderValueInput(schema, instance.value, (v) => {
            const values = [...config.values];
            values[instanceIndex] = {...instance, value: v};
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
      return html`
        <select
          .value=${value}
          @change=${(e: Event) =>
            onUpdate((e.target as HTMLSelectElement).value)}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
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
          <md-icon-button
            @click=${(e: Event) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <md-icon>delete</md-icon>
          </md-icon-button>
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
