import '../stages/base_stage_editor';
import '../stages/chat_editor';
import '../stages/ranking_editor';
import '../stages/info_editor';
import '../stages/payout_editor';
import '../stages/profile_stage_editor';
import '../stages/reveal_editor';
import '../stages/survey_editor';
import '../stages/survey_per_participant_editor';
import '../../pair-components/tooltip';
import '../stages/tos_editor';
import '../stages/transfer_editor';
import './experiment_builder_nav';
import './experiment_settings_editor';
import './stage_builder_dialog';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {StageConfig, StageKind, generateId} from '@deliberation-lab/utils';

import {styles} from './experiment_builder.scss';

/** Experiment builder used to create/edit experiments */
@customElement('experiment-builder')
export class ExperimentBuilder extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  override render() {
    return html`
      <experiment-builder-nav></experiment-builder-nav>
      <div class="experiment-builder">
        <div class="header">${this.renderTitle()} ${this.renderActions()}</div>
        <div class="content">${this.renderContent()}</div>
      </div>
      ${this.renderStageBuilderDialog()}
    `;
  }

  private renderTitle() {
    const stage = this.experimentEditor.currentStage;

    if (stage === undefined) {
      return html`<div>Experiment config</div>`;
    } else {
      return html`
        <div class="left">
          <div class="chip secondary">${stage.kind}</div>
          <div>${stage.name}</div>
        </div>
      `;
    }
  }

  private renderActions() {
    const stage = this.experimentEditor.currentStage;

    if (stage === undefined) {
      return nothing;
    }

    return html` ${this.renderForkAction(stage)} `;
  }

  private renderForkAction(stage: StageConfig) {
    const forkDisabled =
      stage.kind === StageKind.TOS || stage.kind === StageKind.PROFILE;

    return html` <pr-tooltip
      text=${forkDisabled
        ? 'Cannot copy this stage'
        : 'Create a copy of this stage'}
      position="LEFT_START"
    >
      <pr-icon-button
        icon="fork_right"
        color="neutral"
        variant="default"
        ?disabled=${forkDisabled}
        @click=${() => {
          const {id, ...stageWithoutId} = stage;
          this.experimentEditor.addStage({id: generateId(), ...stageWithoutId});
          this.experimentEditor.jumpToLastStage();
        }}
      >
      </pr-icon-button>
    </pr-tooltip>`;
  }

  private renderContent() {
    const stage = this.experimentEditor.currentStage;

    if (stage === undefined) {
      return html`<experiment-settings-editor></experiment-settings-editor>`;
    }

    switch (stage.kind) {
      case StageKind.INFO:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <info-editor .stage=${stage}></info-editor>
        `;
      case StageKind.PAYOUT:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <payout-editor .stage=${stage}></payout-editor>
        `;
      case StageKind.PROFILE:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <profile-stage-editor .stage=${stage}></profile-stage-editor>
        `;
      case StageKind.CHAT:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <chat-editor .stage=${stage}></chat-editor>
        `;
      case StageKind.RANKING:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <ranking-editor .stage=${stage}></ranking-editor>
        `;
      case StageKind.REVEAL:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <reveal-editor .stage=${stage}></reveal-editor>
        `;
      case StageKind.SURVEY:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <survey-editor .stage=${stage}></survey-editor>
        `;
      case StageKind.SURVEY_PER_PARTICIPANT:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <survey-per-participant-editor .stage=${stage}>
          </survey-per-participant-editor>
        `;
      case StageKind.TOS:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <tos-editor .stage=${stage}></tos-editor>
        `;
      case StageKind.TRANSFER:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <transfer-editor .stage=${stage}></transfer-editor>
        `;
      default:
        return nothing;
    }
  }

  private renderStageBuilderDialog() {
    if (this.experimentEditor.showStageBuilderDialog) {
      return html`<stage-builder-dialog
        .showGames=${this.experimentEditor.showGamesTab}
      ></stage-builder-dialog>`;
    }
    return nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-builder': ExperimentBuilder;
  }
}
