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

    return html` ${this.renderInfoLines()} ${this.renderYouTubeInput()} `;
  }

  private renderYouTubeInput() {
    const updateYouTubeId = (e: InputEvent) => {
      const value = (e.target as HTMLInputElement).value;
      if (this.stage) {
        // Extract video ID from various YouTube URL formats
        let videoId = '';
        if (value) {
          // Handle various YouTube URL formats
          const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
          ];

          for (const pattern of patterns) {
            const match = value.match(pattern);
            if (match) {
              videoId = match[1];
              break;
            }
          }
        }

        this.experimentEditor.updateStage({
          ...this.stage,
          youtubeVideoId: videoId || undefined,
        });
      }
    };

    return html`
      <md-outlined-text-field
        type="text"
        label="YouTube Video URL (optional)"
        placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        supporting-text="Paste a YouTube URL or video ID. The video will be embedded below the info text."
        .value=${this.stage?.youtubeVideoId ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateYouTubeId}
      >
      </md-outlined-text-field>
    `;
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
