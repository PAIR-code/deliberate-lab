import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {HomeService} from '../../services/home.service';
import {Pages, RouterService} from '../../services/router.service';

import {ExperimentEditor} from '../../services/experiment.editor';

import {styles} from './experiment_settings_editor.scss';

/** Editor for adjusting experiment settings */
@customElement('experiment-settings-editor')
export class ExperimentSettingsEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    return html`
      ${this.renderMetadata()}
    `;
  }

  private renderMetadata() {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateMetadata({ name });
    };

    const updatePublicName = (e: InputEvent) => {
      const publicName = (e.target as HTMLTextAreaElement).value;
      this.experimentEditor.updateMetadata({ publicName });
    };

    return html`
      <pr-textarea
        label="Private experiment name"
        placeholder="Internal experiment name (not visible to participants)"
        size="medium"
        variant="outlined"
        .value=${this.experimentEditor.metadata.name ?? ''}
        @input=${updateName}
      >
      </pr-textarea>
      <pr-textarea
        label="Public experiment name"
        placeholder="External experiment name (shown to participants)"
        size="medium"
        variant="outlined"
        .value=${this.experimentEditor.metadata.publicName ?? ''}
        @input=${updatePublicName}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-settings-editor': ExperimentSettingsEditor;
  }
}
