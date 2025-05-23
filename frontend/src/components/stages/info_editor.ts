import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import '@material/web/textfield/outlined-text-field.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {InfoStageConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './info_editor.scss';

/** Editor for info stage. */
@customElement('info-editor')
export class InfoEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: InfoStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html` ${this.renderInfoLines()} `;
  }

  private renderInfoLines() {
    const updateInfoLines = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        this.experimentEditor.updateStage({...this.stage, infoLines: [value]});
      }
    };

    return html`
      <md-outlined-text-field
        required
        type="textarea"
        rows="10"
        label="Information to display to participant"
        placeholder="Add info to display to participant"
        .error=${this.stage?.infoLines.length === 0}
        .value=${this.stage?.infoLines.join('\n\n') ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateInfoLines}
      >
      </md-outlined-text-field>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'info-editor': InfoEditorComponent;
  }
}
