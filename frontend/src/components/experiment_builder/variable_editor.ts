import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  VariableConfig,
  VariableConfigType,
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
              The variables defined will be filled (randomly selected from
              possible permutations) by the set of values defined
            </div>
          </div>
          <div class="divider"></div>
          <div class="title">Type</div>
          <pr-tooltip text="Other variable types coming soon">
            <select disabled .value="STRING">
              <option value="STRING">STRING</option>
            </select>
          </pr-tooltip>
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
          <pr-button @click=${addVariable} color="neutral" variant="default">
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
          <pr-button @click=${addValue} color="neutral" variant="default">
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

    return html`
      <pr-textarea
        placeholder="Value"
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
        placeholder="Name of variable"
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
