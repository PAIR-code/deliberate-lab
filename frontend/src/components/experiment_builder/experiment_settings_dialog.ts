import '../../pair-components/button';

import './experiment_settings_editor';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentManager} from '../../services/experiment.manager';

import {styles} from './experiment_settings_dialog.scss';

/** Dialog for updating experiment settings */
@customElement('experiment-settings-dialog')
export class ExperimentSettingsDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentManager = core.getService(ExperimentManager);

  override render() {
    return html`
      <div class="dialog">
        <div class="header">
          <div>Experiment Settings</div>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${() => { this.experimentManager.setIsEditingSettingsDialog(false) }}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          <experiment-settings-editor></experiment-settings-editor>
        </div>
        <div class="footer">
          <pr-button
            color="error"
            variant="tonal"
            @click=${() => { this.experimentManager.deleteExperiment()}}
          >
            Delete experiment
          </pr-button>
          <pr-button
            @click=${() => { this.experimentManager.setIsEditingSettingsDialog(false, true) }}
          >
            Save
          </pr-button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-settings-dialog': ExperimentSettingsDialog;
  }
}