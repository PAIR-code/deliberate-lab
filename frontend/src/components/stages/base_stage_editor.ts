import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ElectionStrategy,
  RevealAudience,
  RankingType,
  StageConfig,
  StageKind,
  StageProgressConfig,
} from '@deliberation-lab/utils';

import {styles} from './base_stage_editor.scss';
import {mustWaitForAllParticipants} from '../../shared/experiment.utils';

/** Editor for base StageConfig fields. */
@customElement('base-stage-editor')
export class BaseStageEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: StageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      ${this.renderName()} ${this.renderPrimaryText()} ${this.renderInfoText()}
      ${this.renderHelpText()}
      ${this.renderWaitForAllParticipants()}
      ${this.renderShowParticipantProgress()}
      <div class="divider"></div>
    `;
  }

  private renderName() {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        this.experimentEditor.updateStage({...this.stage, name});
      }
    };

    return html`
      <pr-textarea
        label="Stage name"
        placeholder="Add stage name"
        variant="outlined"
        .value=${this.stage?.name ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </pr-textarea>
    `;
  }

  private renderPrimaryText() {
    const update = (e: InputEvent) => {
      const primaryText = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        const descriptions = {...this.stage.descriptions, primaryText};
        this.experimentEditor.updateStage({...this.stage, descriptions});
      }
    };

    return html`
      <pr-textarea
        label="Stage description"
        placeholder="Add description"
        variant="outlined"
        .value=${this.stage?.descriptions.primaryText ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${update}
      >
      </pr-textarea>
    `;
  }

  private renderInfoText() {
    const update = (e: InputEvent) => {
      const infoText = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        const descriptions = {...this.stage.descriptions, infoText};
        this.experimentEditor.updateStage({...this.stage, descriptions});
      }
    };

    return html`
      <pr-textarea
        label="Info popup text"
        placeholder="Add info popup text"
        variant="outlined"
        .value=${this.stage?.descriptions.infoText ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${update}
      >
      </pr-textarea>
    `;
  }

  private renderHelpText() {
    const update = (e: InputEvent) => {
      const helpText = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        const descriptions = {...this.stage.descriptions, helpText};
        this.experimentEditor.updateStage({...this.stage, descriptions});
      }
    };

    return html`
      <pr-textarea
        label="Help popup text"
        placeholder="Add help popup text"
        variant="outlined"
        .value=${this.stage?.descriptions.helpText ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${update}
      >
      </pr-textarea>
    `;
  }

  private renderWaitForAllParticipants() {
    if (!this.stage) return nothing;
    const waitForAllParticipants = this.stage.progress.waitForAllParticipants;

    const updateCheck = () => {
      if (!this.stage) return;
      const progress: StageProgressConfig = {
        ...this.stage.progress,
        waitForAllParticipants: !waitForAllParticipants,
      };
      this.experimentEditor.updateStage({...this.stage, progress});
    };

    const mustWait = mustWaitForAllParticipants(
      this.stage,
      this.experimentEditor.stages
    );
    
    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${waitForAllParticipants}
            ?disabled=${mustWait || !this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>Hold for x number of participants to arrive at this stage
          ${mustWait
            ? html`
                <br/>
                <div class="warning">
                  Because this experiment has a dependency on all participants'
                  responses, this must be enabled.
                </div>
              `
            : ''}
          </div>
        </div>
        ${waitForAllParticipants ? this.renderMinParticipants() : ''}
      </div>
    `;
  }

  private renderShowParticipantProgress() {
    if (!this.stage) return nothing;
    const showParticipantProgress = this.stage.progress.showParticipantProgress;

    const updateCheck = () => {
      if (!this.stage) return;
      const progress: StageProgressConfig = {
        ...this.stage.progress,
        showParticipantProgress: !showParticipantProgress,
      };
      this.experimentEditor.updateStage({...this.stage, progress});
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${showParticipantProgress}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>
            Show participant progress (number of participants who have completed
            stage)
          </div>
        </div>
      </div>
    `;
  }

  private renderMinParticipants() {
    const minParticipants = this.stage?.progress.minParticipants ?? 0;

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const minParticipants = Number((e.target as HTMLTextAreaElement).value);
      const progress: StageProgressConfig = {
        ...this.stage.progress,
        minParticipants,
      };
      this.experimentEditor.updateStage({...this.stage, progress});
    };

    return html`
      <div class="config-item">
        <div class="number-input tab">
          <label for="minParticipants"> Minimum number of participants </label>
          <input
            type="number"
            id="minParticipants"
            name="minParticipants"
            min="0"
            .value=${minParticipants ?? 0}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateNum}
          />
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'base-stage-editor': BaseStageEditorComponent;
  }
}
