import {TextArea} from './textarea';

import {CSSResultGroup, html, nothing} from 'lit';
import {customElement} from 'lit/decorators.js';

import {core} from '../core/core';
// TODO(rasmi): Remove AuthService import when variables are out of alpha
import {AuthService} from '../services/auth.service';
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
 * Only performs validation when Alpha features are enabled.
 */
@customElement('pr-textarea-template')
export class TextAreaTemplate extends TextArea {
  static override styles: CSSResultGroup = [TextArea.styles, styles];

  // TODO(rasmi): Remove authService when variables are out of alpha
  private readonly authService = core.getService(AuthService);
  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    // TODO(rasmi): Remove this check when variables are out of alpha
    // Only validate when Alpha features (including templating) are enabled
    if (!this.authService.showAlphaFeatures) {
      return super.render();
    }

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
