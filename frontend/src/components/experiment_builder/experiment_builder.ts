import '../stages/base_stage_editor';
import '../stages/chat_editor';
import '../stages/ranking_editor';
import '../stages/info_editor';
import '../stages/payout_editor';
import '../stages/profile_stage_editor';
import '../stages/reveal_editor';
import '../stages/survey_editor';
import '../stages/survey_per_participant_editor';
import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../stages/tos_editor';
import '../stages/transfer_editor';
import './agent_editor';
import './experiment_builder_nav';
import './experiment_settings_editor';
import './stage_builder_dialog';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {AgentEditor} from '../../services/agent.editor';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {Pages, RouterService} from '../../services/router.service';

import {
  StageConfig,
  StageKind,
  generateId,
  createAgentMediatorConfig,
} from '@deliberation-lab/utils';

import {styles} from './experiment_builder.scss';

enum PanelView {
  AGENTS = 'agents',
  DEFAULT = 'default',
  STAGES = 'stages',
}

/** Experiment builder used to create/edit experiments */
@customElement('experiment-builder')
export class ExperimentBuilder extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentEditor = core.getService(AgentEditor);
  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.DEFAULT;
  @state() testAgentConfigResponse = '';

  override render() {
    return html`
      ${this.renderNavPanel()} ${this.renderExperimentConfigBuilder()}
      ${this.renderAgentBuilder()} ${this.renderStageBuilder()}
      ${this.renderStageBuilderDialog()}
    `;
  }

  private renderNavPanel() {
    const isSelected = (panelView: PanelView) => {
      return this.panelView === panelView;
    };

    return html`
      <div class="panel-wrapper">
        <div class="sidebar">
          <pr-tooltip text="General experiment settings" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="folder_managed"
              size="medium"
              variant=${isSelected(PanelView.DEFAULT) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.DEFAULT;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Experiment stages" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="list"
              size="medium"
              variant=${isSelected(PanelView.STAGES) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.STAGES;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Agents" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="robot_2"
              size="medium"
              variant=${isSelected(PanelView.AGENTS) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.AGENTS;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
        ${this.renderPanelView()}
      </div>
    `;
  }

  private renderPanelView() {
    if (this.panelView === PanelView.DEFAULT) {
      return html`
        <div class="panel-view">
          <div class="top">
            <div class="panel-view-header">General settings</div>
            <div>
              Edit experiment metadata to the right, then use the tabs on the
              left to add experiment stages and agents.
            </div>
            ${this.renderLoadGameButton()}
          </div>
          <div class="bottom">${this.renderDeleteButton()}</div>
        </div>
      `;
    }
    if (this.panelView === PanelView.STAGES) {
      return html`
        <div class="panel-view">
          <div class="top">
            <div class="panel-view-header">Experiment stages</div>
            ${this.renderAddStageButton()} ${this.renderLoadGameButton()}
          </div>
          <div class="bottom"></div>
        </div>
      `;
    }
    if (this.panelView === PanelView.AGENTS) {
      return html`
        <div class="panel-view">
          <div class="banner warning">
            <p>
              For testing only! Settings on this page do not yet connect to the
              saved experiment.
            </p>
          </div>
          <div class="top">
            <div class="panel-view-header">Agents</div>
            <pr-button
              @click=${async () => {
                this.testAgentConfigResponse =
                  await this.experimentManager.testAgentConfig();
              }}
            >
              Test agent mediator
            </pr-button>
            <div>${this.testAgentConfigResponse}</div>
          </div>
        </div>
      `;
    }
    return nothing;
  }

  private renderAddStageButton() {
    return html`
      <pr-button
        color="tertiary"
        variant="tonal"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.experimentEditor.toggleStageBuilderDialog(false);
        }}
      >
        Add stage
      </pr-button>
    `;
  }

  private renderLoadGameButton() {
    return html`
      <pr-button
        color="tertiary"
        variant="tonal"
        ?disabled=${!this.experimentEditor.canEditStages}
        @click=${() => {
          this.experimentEditor.toggleStageBuilderDialog(true);
        }}
      >
        Load game
      </pr-button>
    `;
  }

  private renderDeleteButton() {
    if (this.routerService.activePage === Pages.EXPERIMENT_CREATE) {
      return nothing;
    }

    return html`
      <pr-button
        color="error"
        variant="outlined"
        ?disabled=${!this.experimentManager.isCreator}
        @click=${() => {
          const isConfirmed = window.confirm(
            `Are you sure you want to delete this experiment?`,
          );
          if (!isConfirmed) return;

          this.analyticsService.trackButtonClick(ButtonClick.EXPERIMENT_DELETE);
          this.experimentManager.deleteExperiment();
        }}
      >
        <pr-icon color="error" icon="delete"></pr-icon>
        Delete experiment
      </pr-button>
    `;
  }

  private renderAgentBuilder() {
    if (this.panelView !== PanelView.AGENTS) {
      return nothing;
    }

    const agent = this.agentEditor.getAgentMediator('test');

    return html`
      <div class="experiment-builder">
        <agent-editor .agent=${agent}></agent-editor>
      </div>
    `;
  }

  private renderExperimentConfigBuilder() {
    if (this.panelView !== PanelView.DEFAULT) {
      return nothing;
    }

    return html`
      <div class="experiment-builder">
        <experiment-settings-editor></experiment-settings-editor>
      </div>
    `;
  }

  private renderStageBuilder() {
    if (this.panelView !== PanelView.STAGES) {
      return nothing;
    }

    if (this.experimentEditor.stages.length === 0) {
      return html` <div class="content">Add a stage to get started.</div> `;
    }

    return html`
      <experiment-builder-nav></experiment-builder-nav>
      <div class="experiment-builder">
        <div class="header">${this.renderTitle()} ${this.renderActions()}</div>
        <div class="content">${this.renderContent()}</div>
      </div>
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
      return html` Select a stage to edit. `;
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
