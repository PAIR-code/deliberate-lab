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
      ${this.renderHelpText()} ${this.renderMinParticipants()}
      ${this.renderWaitForAllParticipants()}
      ${this.renderShowParticipantProgress()}
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

  private shouldDisableWaitForAllParticipants(): boolean {
    if (!this.stage || this.stage.kind !== StageKind.REVEAL) {
      return false;
    }

    for (const item of this.stage.items) {
      // There's a dependency on all participants if we want to reveal all results.
      if (
        'revealAudience' in item &&
        item.revealAudience === RevealAudience.ALL_PARTICIPANTS
      ) {
        return true;
      }
      if (item.kind === StageKind.RANKING) {
        const stageId = item.id;

        const foundStage = this.experimentEditor.stages.find(
          (stage) => stage.id === stageId
        );
        // There's a dependency on all participants if we're ranking all participants.
        if (
          foundStage &&
          'rankingType' in foundStage &&
          foundStage.rankingType === RankingType.PARTICIPANTS
        ) {
          return true;
        }

        // There's a dependency on all participants if there's an election
        // (so all votes are counted).
        if (
          foundStage &&
          'strategy' in foundStage &&
          foundStage.strategy === ElectionStrategy.CONDORCET
        ) {
          return true;
        }
      }
    }

    return false;
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

    if (this.shouldDisableWaitForAllParticipants()) {
      if (!waitForAllParticipants) {
        const progress: StageProgressConfig = {
          ...this.stage.progress,
          waitForAllParticipants: true,
        };
        this.experimentEditor.updateStage({...this.stage, progress});
      }

      return html`
        <div class="config-item">
          <div class="checkbox-wrapper">
            <md-checkbox
              touch-target="wrapper"
              ?checked="${true}"
              ?disabled="${true}"
            >
            </md-checkbox>
            <div>Wait for all participants before starting stage<br/</div>
            <div class="warning">
              Because this experiment has a dependency on all participants'
              responses, this must be enabled.
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${waitForAllParticipants}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>Wait for all participants before starting stage</div>
        </div>
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
        <div class="number-input">
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
