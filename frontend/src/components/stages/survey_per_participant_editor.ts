import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '../stages/survey_editor';
import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {SurveyPerParticipantStageConfig} from '@deliberation-lab/utils';

import {styles} from './survey_editor.scss';

/** Survey per participant editor for survey questions. */
@customElement('survey-per-participant-editor')
export class SurveyEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: SurveyPerParticipantStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <label class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${this.stage.enableSelfSurvey}
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${() => {
            if (!this.stage) return;
            this.experimentEditor.updateStage({
              ...this.stage,
              enableSelfSurvey: !this.stage.enableSelfSurvey,
            });
          }}
        >
        </md-checkbox>
        <span class="checkbox-label">
          Enable self-survey for participants (participants answer survey
          questions about themself)
        </span>
      </label>
      <survey-editor .stage=${this.stage}></survey-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'survey-per-participant-editor': SurveyEditor;
  }
}
