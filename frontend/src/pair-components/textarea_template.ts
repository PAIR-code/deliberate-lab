import {TextArea} from './textarea';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../core/core';
import {ExperimentEditor} from '../services/experiment.editor';

import {
  extractVariablesFromVariableConfigs,
  formatInvalidVariable,
  validateTemplateVariables,
} from '@deliberation-lab/utils';

import {styles} from './textarea_template.css';

/**
 * Template-aware textarea that validates Mustache variable references.
 * Extends pr-textarea and adds validation against experiment variables.
 *
 * Inherits all properties and behavior from pr-textarea automatically.
 */
@customElement('pr-textarea-template')
export class TextAreaTemplate extends TextArea {
  static override styles: CSSResultGroup = [TextArea.styles, styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    const variableMap = extractVariablesFromVariableConfigs(
      this.experimentEditor.experiment?.variableConfigs ?? [],
    );
    const validation = validateTemplateVariables(this.value, variableMap);

    // Toggle error class on host element
    this.classList.toggle('has-error', !validation.valid);

    return html`
      ${super.render()}
      ${!validation.valid
        ? html`<div class="validation-error">
            ${validation.invalidVariables
              .map((v) => formatInvalidVariable(v))
              .join('; ')}
          </div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pr-textarea-template': TextAreaTemplate;
  }
}
