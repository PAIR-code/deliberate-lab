import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  SeedStrategy,
  VariableConfig,
  VariableConfigType,
  VariableType,
  createRandomPermutationVariableConfig,
} from '@deliberation-lab/utils';

import {styles} from './experiment_settings_editor.scss';

/** Experiment variable editor. */
@customElement('variable-editor')
export class VariableEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    const addVariableConfig = () => {
      this.experimentEditor.addVariableConfig(
        createRandomPermutationVariableConfig(),
      );
    };

    const variableConfigs =
      this.experimentEditor.experiment?.variableConfigs ?? [];

    return html`
      <div class="inner-wrapper">
        <div class="title">Variables</div>
        <p>
          Any variables configured below can be referenced in stage descriptions
          (and other select stage fields) via
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
          >
          for more information.
        </p>
        ${variableConfigs.map((variableConfig, index) =>
          this.renderVariableConfig(variableConfig, index),
        )}
        <pr-button @click=${addVariableConfig}
          >Add new variable config</pr-button
        >
      </div>
    `;
  }

  private updateVariableConfig(
    variableConfig: VariableConfig,
    updated: Partial<VariableConfig>,
    index: number,
  ) {
    this.experimentEditor.updateVariableConfig(
      {...variableConfig, ...updated},
      index,
    );
  }

  private renderVariableConfig(variableConfig: VariableConfig, index: number) {
    const addVariable = () => {
      this.updateVariableConfig(
        variableConfig,
        {variableNames: [...variableConfig.variableNames, '']},
        index,
      );
    };
    const addValue = () => {
      this.updateVariableConfig(
        variableConfig,
        {values: [...variableConfig.values, '']},
        index,
      );
    };
    const updateSeed = (e: Event) => {
      const seedStrategy = (e.target as HTMLSelectElement)
        .value as SeedStrategy;
      if (seedStrategy) {
        this.updateVariableConfig(variableConfig, {seedStrategy}, index);
      }
    };

    return html`
      <div class="variable-wrapper">
        <div class="label">Variable Group ${index + 1}</div>
        <div class="variable">
          <div class="title">Configuration type</div>
          <div class="select-field">
            <pr-tooltip text="Other variable config options coming soon">
              <select disabled .value="">
                <option value="">Partial permutation</option>
              </select>
            </pr-tooltip>
            <div class="description">
              The variables (1 or more) defined will be filled (randomly
              selected from possible permutations) by the set of values defined
            </div>
          </div>
          <div class="divider"></div>
          <div class="title">Type</div>
          <select .value=${variableConfig.variableType}>
            <option
              value="${VariableType.STRING}"
              ?selected=${VariableType.STRING === variableConfig.variableType}
            >
              string
            </option>
            <option
              value="${VariableType.STRING}"
              ?selected=${VariableType.OBJECT === variableConfig.variableType}
            >
              object
            </option>
          </select>
          <div class="divider"></div>
          <div class="title">Seed strategy</div>
          <div class="description">
            This is what level the variable should be assigned at
          </div>
          <select .value=${variableConfig.seedStrategy} @change=${updateSeed}>
            <option
              value="${SeedStrategy.COHORT}"
              ?selected=${SeedStrategy.COHORT === variableConfig.seedStrategy}
            >
              cohort
            </option>
            <option
              value="${SeedStrategy.PARTICIPANT}"
              ?selected=${SeedStrategy.PARTICIPANT ===
              variableConfig.seedStrategy}
            >
              participant
            </option>
          </select>
          <div class="divider"></div>
          <div class="title">Variables</div>
          ${variableConfig.variableNames.map((name, variableIndex) =>
            this.renderVariableNameEditor(
              variableConfig,
              name,
              index,
              variableIndex,
            ),
          )}
          <pr-button @click=${addVariable} color="secondary" variant="tonal">
            + Add variable
          </pr-button>
          <div class="divider"></div>
          <div class="title">Set of values to choose from</div>
          ${variableConfig.values.map((value, valueIndex) =>
            this.renderVariableValueEditor(
              variableConfig,
              value,
              index,
              valueIndex,
            ),
          )}
          <pr-button @click=${addValue} color="secondary" variant="tonal">
            + Add value
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderVariableValueEditor(
    variableConfig: VariableConfig,
    value: string,
    configIndex: number,
    valueIndex: number,
  ) {
    const updateValue = (e: InputEvent) => {
      const newValue = (e.target as HTMLTextAreaElement).value;
      this.updateVariableConfig(
        variableConfig,
        {
          values: [
            ...variableConfig.values.slice(0, valueIndex),
            newValue,
            ...variableConfig.values.slice(valueIndex + 1),
          ],
        },
        configIndex,
      );
    };

    const placeholder = `Value, e.g., 'San Francisco' for string variable or '{"name": "San Francisco"}' for object variable`;
    return html`
      <pr-textarea
        placeholder=${placeholder}
        .value=${value}
        variant="outlined"
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateValue}
      >
      </pr-textarea>
    `;
  }

  private renderVariableNameEditor(
    variableConfig: VariableConfig,
    name: string,
    configIndex: number,
    variableIndex: number,
  ) {
    const updateName = (e: InputEvent) => {
      const newName = (e.target as HTMLTextAreaElement).value;
      this.updateVariableConfig(
        variableConfig,
        {
          variableNames: [
            ...variableConfig.variableNames.slice(0, variableIndex),
            newName,
            ...variableConfig.variableNames.slice(variableIndex + 1),
          ],
        },
        configIndex,
      );
    };

    return html`
      <pr-textarea
        placeholder=${`Name of variable, e.g., city_${variableIndex + 1}`}
        .value=${name}
        variant="outlined"
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-editor': VariableEditor;
  }
}
