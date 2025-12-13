import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';
import '../../pair-components/textarea_template';

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

enum BaseStageTab {
  STAGE = 'stage', // settings specific to stage
  METADATA = 'metadata', // stage name, description, etc.
  PROGRESS = 'progress', // progress settings
}

/** Editor for base StageConfig fields. */
@customElement('base-stage-editor')
export class BaseStageEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: StageConfig | undefined = undefined;

  @state() currentTab: BaseStageTab = BaseStageTab.STAGE;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="tabs">
        <div
          class="tab ${this.currentTab === BaseStageTab.METADATA
            ? 'active'
            : ''}"
          @click=${() => {
            this.currentTab = BaseStageTab.METADATA;
          }}
        >
          Metadata
        </div>
        <div
          class="tab ${this.currentTab === BaseStageTab.PROGRESS
            ? 'active'
            : ''}"
          @click=${() => {
            this.currentTab = BaseStageTab.PROGRESS;
          }}
        >
          Progress settings
        </div>
        <div
          class="tab ${this.currentTab === BaseStageTab.STAGE ? 'active' : ''}"
          @click=${() => {
            this.currentTab = BaseStageTab.STAGE;
          }}
        >
          <slot name="title"></slot>
        </div>
      </div>
      ${this.renderTab()}
    `;
  }

  private renderTab() {
    switch (this.currentTab) {
      case BaseStageTab.METADATA:
        return html`
          <div class="inner-section">
            ${this.renderName()} ${this.renderPrimaryText()}
            ${this.renderInfoText()}
          </div>
        `;
      case BaseStageTab.PROGRESS:
        return html`
          <div class="inner-section">
            ${this.renderWaitForAllParticipants()}
            ${this.renderWaitForNumParticipants()}
            ${this.renderShowParticipantProgress()}
          </div>
        `;
      default:
        return html`<div class="inner-section"><slot></slot></div>`;
    }
  }

  private renderName() {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      if (this.stage) {
        this.experimentEditor.updateStage({...this.stage, name});
      }
    };

    return html`
      <md-filled-text-field
        label="Stage name"
        required
        ?disabled=${!this.experimentEditor.canEditStages}
        .error=${!this.stage?.name}
        .value=${this.stage?.name ?? ''}
        @input=${updateName}
      >
      </md-filled-text-field>
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
      <pr-textarea-template
        label="Stage description or instructions (optional)"
        .value=${this.stage?.descriptions.primaryText ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        variant="outlined"
        rows="3"
        @input=${update}
      >
      </pr-textarea-template>
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
      <pr-textarea-template
        label="Info popup text (optional)"
        .value=${this.stage?.descriptions.infoText ?? ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        variant="outlined"
        rows="3"
        @input=${update}
      >
      </pr-textarea-template>
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
      this.experimentEditor.stages,
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
          <div>
            Wait for <b>all active participants</b> to reach this stage before
            allowing progression
            ${mustWait
              ? html`
                  <br />
                  <div class="warning">
                    Because this experiment has a dependency on all
                    participants' responses, this must be enabled.
                  </div>
                `
              : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderWaitForNumParticipants() {
    if (!this.stage) return nothing;
    const hasNumParticipants = this.stage.progress.minParticipants > 0;

    const updateCheck = (e: InputEvent) => {
      if (!this.stage) return;
      const minParticipants = hasNumParticipants ? 0 : 2;

      const progress: StageProgressConfig = {
        ...this.stage.progress,
        minParticipants,
      };

      this.experimentEditor.updateStage({...this.stage, progress});
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${hasNumParticipants}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>
            Wait for <b>a fixed number of participants</b> to reach this stage
            before allowing progression
          </div>
        </div>
        ${hasNumParticipants ? this.renderMinParticipants() : ''}
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
