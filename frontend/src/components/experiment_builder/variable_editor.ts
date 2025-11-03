import '../../pair-components/textarea';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {VariableItem, VariableType} from '@deliberation-lab/utils';

import {styles} from './experiment_settings_editor.scss';

/** Experiment variable editor. */
@customElement('variable-editor')
export class VariableEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    const addVariable = () => {
      this.experimentEditor.addVariable({
        name: '',
        description: '',
        type: VariableType.STRING,
      });
    };

    const variables = this.experimentEditor.experiment?.variables ?? [];

    return html`
      <div class="inner-wrapper">
        <div class="title">Variables</div>
        ${variables.map((variable, index) =>
          this.renderVariable(variable, index),
        )}
        <pr-button @click=${addVariable}>Add new variable</pr-button>
      </div>
    `;
  }

  private renderVariable(variable: VariableItem, index: number) {
    const updateVariable = (updated: Partial<VariableItem>) => {
      this.experimentEditor.updateVariable({...variable, ...updated}, index);
    };
    const updateName = (e: InputEvent) => {
      updateVariable({name: (e.target as HTMLTextAreaElement).value});
    };

    return html`
      <div class="variable-wrapper">
        <div class="label">Variable ${index + 1}</div>
        <div class="variable">
          <pr-textarea
            placeholder="Name of variable"
            .value=${variable.name}
            variant="outlined"
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateName}
          >
          </pr-textarea>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-editor': VariableEditor;
  }
}
