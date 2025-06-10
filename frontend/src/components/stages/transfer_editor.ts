import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {TransferStageConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './transfer_editor.scss';

/** Editor for transfer stage. */
@customElement('transfer-editor')
export class TransferEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: TransferStageConfig | undefined = undefined;

  private renderSurveyToggle() {
    if (!this.stage) return nothing;
    const isSurveyMatchingEnabled = this.stage.enableSurveyMatching || false;

    const updateSurveyMatching = () => {
      if (!this.stage) return;
      const enableSurveyMatching = !isSurveyMatchingEnabled;
      this.experimentEditor.updateStage({...this.stage, enableSurveyMatching});
    };

    return html`
      <div class="section">
        <div class="title">Automatic transfer</div>
        <div class="description">
          If you would like to transfer participants based on rules rather than manually,
          specify the behavior here.
        </div>

        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isSurveyMatchingEnabled}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateSurveyMatching}
          >
          </md-checkbox>
          <div>Automatically match participants based on survey answers</div>
        </div>
      </div>
    `;
  }

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.renderSurveyToggle()}
      ${this.stage.enableSurveyMatching ? this.renderSurveyConfig() : nothing}
      ${this.renderTimeout()}
    `;
  }

  private renderTimeout() {
    if (!this.stage) return;
    const isTimeout = this.stage.enableTimeout;

    const updateTimeout = () => {
      if (!this.stage) return;
      const enableTimeout = !isTimeout;
      this.experimentEditor.updateStage({...this.stage, enableTimeout});
    };

    return html`
      <div class="section">
        <div class="title">Timeout</div>
        <div class="description">
          Note: If timeout is enabled and the experimenter does not transfer the
          participant within the timeout window, the participant is removed from
          the experiment with TIMEOUT_FAILED status
        </div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isTimeout}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateTimeout}
          >
          </md-checkbox>
          <div>Enable timeout window</div>
        </div>
        ${isTimeout ? this.renderTimeoutSeconds() : nothing}
      </div>
    `;
  }

  private renderTimeoutSeconds() {
    if (!this.stage) return nothing;
    const waitSeconds = this.stage.timeoutSeconds;
    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const timeoutSeconds = Number((e.target as HTMLTextAreaElement).value);
      this.experimentEditor.updateStage({...this.stage, timeoutSeconds});
    };

    return html`
      <div class="number-input">
        <label for="waitSeconds">
          Timeout window (in seconds) before transfer stage ends
        </label>
        <input
          type="number"
          id="waitSeconds"
          name="waitSeconds"
          min="0"
          .value=${waitSeconds}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateNum}
        />
      </div>
    `;
  }

  private renderSurveyConfig() {
    if (!this.stage) return nothing;

    const updateSurveyStageId = (e: InputEvent) => {
      if (!this.stage) return;
      const surveyStageId = (e.target as HTMLInputElement).value;
      this.experimentEditor.updateStage({...this.stage, surveyStageId});
    };

    const updateSurveyQuestionId = (e: InputEvent) => {
      if (!this.stage) return;
      const surveyQuestionId = (e.target as HTMLInputElement).value;
      this.experimentEditor.updateStage({...this.stage, surveyQuestionId});
    };

    const updateParticipantCounts = (e: InputEvent) => {
      if (!this.stage) return;
      try {
        const participantCounts = JSON.parse((e.target as HTMLInputElement).value);
        this.experimentEditor.updateStage({...this.stage, participantCounts});
      } catch {
        // Handle invalid JSON input gracefully
      }
    };

    return html`
      <div class="number-input">
        <label for="surveyStageId">Survey Stage ID</label>
        <input
          type="text"
          id="surveyStageId"
          name="surveyStageId"
          .value=${this.stage.surveyStageId || ''}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateSurveyStageId}
        />

        <label for="surveyQuestionId">Survey Question ID</label>
        <input
          type="text"
          id="surveyQuestionId"
          name="surveyQuestionId"
          .value=${this.stage.surveyQuestionId || ''}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateSurveyQuestionId}
        />

        <label for="participantCounts">
          Provide a JSON object mapping survey answer ids to required participant counts.
        </label>
        <input
          type="text"
          id="participantCounts"
          name="participantCounts"
          .value=${JSON.stringify(this.stage.participantCounts || {}, null, 2)}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateParticipantCounts}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-editor': TransferEditorComponent;
  }
}
