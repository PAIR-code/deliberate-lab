import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '@material/web/textfield/outlined-text-field.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {TOSStageConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './info_editor.scss';

/** Editor for TOS stage. */
@customElement('tos-editor')
export class TOSEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: TOSStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html` ${this.renderTOSLines()} `;
  }

  private renderTOSLines() {
    const updateTOSLines = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        this.experimentEditor.updateStage({...this.stage, tosLines: [value]});
      }
    };

    return html`
      <md-outlined-text-field
        required
        type="textarea"
        rows="10"
        label="Terms of service"
        placeholder="Add terms of service"
        .error=${this.stage?.tosLines.length === 0}
        .value=${this.stage?.tosLines.join('\n\n') ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateTOSLines}
      >
      </md-outlined-text-field>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tos-editor': TOSEditorComponent;
  }
}
