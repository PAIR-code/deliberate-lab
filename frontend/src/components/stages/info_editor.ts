import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  InfoStageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './info_editor.scss';

/** Editor for info stage. */
@customElement('info-editor')
export class InfoEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: InfoStageConfig|undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.renderInfoLines()}
    `;
  }

  private renderInfoLines() {
    const updateInfoLines = (e: InputEvent) => {
      const value = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        this.experimentEditor.updateStage({ ...this.stage, infoLines: [value] });
      }
    };

    return html`
      <pr-textarea
        label="Info"
        placeholder="Add info to display to participant"
        size="medium"
        variant="outlined"
        .value=${this.stage?.infoLines.join('\n\n') ?? ''}
        @input=${updateInfoLines}
      >
      </pr-textarea>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'info-editor': InfoEditorComponent;
  }
}