import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../experimenter/experimenter_data_editor';
import '../stages/asset_allocation_editor';
import '../stages/base_stage_editor';
import '../stages/group_chat_editor';
import '../stages/flipcard_editor';
import '../stages/ranking_editor';
import '../stages/info_editor';
import '../stages/payout_editor';
import '../stages/profile_stage_editor';
import '../stages/reveal_editor';
import '../stages/role_editor';
import '../stages/stockinfo_editor';
import '../stages/survey_editor';
import '../stages/survey_per_participant_editor';
import '../stages/tos_editor';
import '../stages/transfer_editor';
import './agent_chat_prompt_editor';
import './agent_persona_editor';
import './experiment_builder_nav';
import './experiment_settings_editor';
import './stage_builder_dialog';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {Pages, RouterService} from '../../services/router.service';

import {StageConfig, StageKind, generateId} from '@deliberation-lab/utils';

import {styles} from './experiment_builder.scss';

enum PanelView {
  AGENTS = 'agents',
  API_KEY = 'api_key',
  DEFAULT = 'default',
  STAGES = 'stages',
}

/** Experiment builder used to create/edit experiments */
@customElement('experiment-builder')
export class ExperimentBuilder extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.DEFAULT;

  override render() {
    return html`
      ${this.renderNavPanel()} ${this.renderExperimentConfigBuilder()}
      ${this.renderExperimenterSettings()} ${this.renderStageBuilderDialog()}
    `;
  }

  private renderStageBuilderDialog() {
    if (this.experimentEditor.showStageBuilderDialog) {
      return html`<stage-builder-dialog
        .showTemplates=${this.experimentEditor.showTemplatesTab}
      ></stage-builder-dialog>`;
    }
    return nothing;
  }

  private renderNavPanel() {
    const isSelected = (panelView: PanelView) => {
      return this.panelView === panelView;
    };

    return html`
      <div class="panel-wrapper">
        <div class="sidebar">
          <pr-tooltip text="Experiment settings" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="folder_managed"
              size="medium"
              variant=${!isSelected(PanelView.API_KEY) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.DEFAULT;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="API key settings" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="key"
              size="medium"
              variant=${isSelected(PanelView.API_KEY) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.API_KEY;
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
    if (this.panelView === PanelView.API_KEY) {
      return html`
        <div class="panel-view">
          <div class="top">
            <div class="panel-view-header">Experimenter settings</div>
            <div>
              ⚠️ Note that experimenter API settings are shared across all
              experiments!
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="panel-view">
        <div class="top">
          <div class="panel-view-header">
            <div class="header-title">General settings</div>
            ${this.renderAddStageButton()}
          </div>
          <div
            class="general-item ${this.panelView === PanelView.DEFAULT
              ? 'current'
              : ''}"
            @click=${() => {
              this.panelView = PanelView.DEFAULT;
            }}
          >
            <div>Metadata</div>
            <div class="subtitle">
              Experiment name, visibility, Prolific integration
            </div>
          </div>
          <div
            class="general-item ${this.panelView === PanelView.STAGES
              ? 'current'
              : ''}"
            @click=${() => {
              this.panelView = PanelView.STAGES;
            }}
          >
            <div>Stages</div>
            <div class="subtitle">Add and configure experiment stages</div>
          </div>
          <div class="panel-view-header">
            <div class="header-title">Agent Mediators</div>
            ${this.renderAddMediatorButton()}
          </div>
          ${this.experimentEditor.agentMediators.map(
            (mediator) => html`
              <div
                class="agent-item ${this.experimentEditor.currentAgentId ===
                  mediator.persona.id && this.panelView === PanelView.AGENTS
                  ? 'current'
                  : ''}"
                @click=${() => {
                  this.panelView = PanelView.AGENTS;
                  this.experimentEditor.setCurrentAgentId(mediator.persona.id);
                }}
              >
                <div>
                  ${mediator.persona.name.length > 0
                    ? mediator.persona.name
                    : mediator.persona.defaultProfile.name}
                </div>
                <div class="subtitle">
                  ${mediator.persona.defaultModelSettings.modelName}
                </div>
                <div class="subtitle">${mediator.persona.id}</div>
              </div>
            `,
          )}
          <div class="panel-view-header">
            <div class="header-title">Agent Participants</div>
            ${this.renderAddParticipantButton()}
          </div>
          ${this.experimentEditor.agentParticipants.map(
            (agent) => html`
              <div
                class="agent-item ${this.experimentEditor.currentAgentId ===
                  agent.persona.id && this.panelView === PanelView.AGENTS
                  ? 'current'
                  : ''}"
                @click=${() => {
                  this.panelView = PanelView.AGENTS;
                  this.experimentEditor.setCurrentAgentId(agent.persona.id);
                }}
              >
                <div>
                  ${agent.persona.name.length > 0
                    ? agent.persona.name
                    : agent.persona.defaultProfile.name}
                </div>
                <div class="subtitle">
                  ${agent.persona.defaultModelSettings.modelName}
                </div>
                <div class="subtitle">${agent.persona.id}</div>
              </div>
            `,
          )}
        </div>
        <div class="bottom">${this.renderDeleteButton()}</div>
      </div>
    `;
  }

  private renderAddMediatorButton() {
    return html`
      <pr-tooltip text="Add agent mediator persona" position="BOTTOM_END">
        <pr-icon-button
          icon="person_add"
          color="neutral"
          variant="default"
          @click=${() => {
            this.panelView = PanelView.AGENTS;
            this.experimentEditor.addAgentMediator();
          }}
        >
        </pr-icon-button>
      </pr-tootipt>
    `;
  }

  private renderAddParticipantButton() {
    return html`
      <pr-tooltip text="Add agent participant persona" position="BOTTOM_END">
        <pr-icon-button
          icon="person_add"
          color="neutral"
          variant="default"
          @click=${() => {
            this.panelView = PanelView.AGENTS;
            this.experimentEditor.addAgentParticipant();
          }}
        >
        </pr-icon-button>
      </pr-tootipt>
    `;
  }

  private renderAddStageButton() {
    return html`
      <pr-tooltip text="Add stage or load template" position="BOTTOM_END">
        <pr-icon-button
          icon="playlist_add"
          color="neutral"
          variant="default"
          ?disabled=${!this.experimentEditor.canEditStages}
          @click=${() => {
            this.experimentEditor.toggleStageBuilderDialog(false);
          }}
        >
        </pr-icon-button>
      </pr-tootipt>
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

  private renderExperimenterSettings() {
    if (this.panelView !== PanelView.API_KEY) {
      return nothing;
    }
    return html`
      <div class="experiment-builder">
        <div class="content">
          <experimenter-data-editor></experimenter-data-editor>
        </div>
      </div>
    `;
  }

  private renderExperimentConfigBuilder() {
    if (this.panelView === PanelView.DEFAULT) {
      return html`
        <div class="experiment-builder">
          <experiment-settings-editor></experiment-settings-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.AGENTS) {
      const agent = this.experimentEditor.currentAgent;
      return html`
        <div class="experiment-builder">
          <agent-persona-editor .agent=${agent?.persona}>
            ${this.experimentEditor.stages.map(
              (stage, index) => html`
                <agent-chat-prompt-editor
                  .agent=${agent?.persona}
                  .stageId=${stage.id}
                  .stageNamePrefix=${`${index + 1}. `}
                >
                </agent-chat-prompt-editor>
              `,
            )}
          </agent-persona-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.STAGES) {
      return this.renderStageBuilder();
    }
    return nothing;
  }

  private renderStageBuilder() {
    if (this.panelView !== PanelView.STAGES) {
      return nothing;
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

    const updateTitle = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      if (stage) {
        this.experimentEditor.updateStage({...stage, name});
      }
    };

    if (stage === undefined) {
      return html`<div>Experiment config</div>`;
    } else {
      return html`
        <div class="left">
          <div class="chip secondary">${stage.kind}</div>
          <pr-textarea
            class="title-field"
            placeholder="Stage name (click to edit)"
            size="large"
            .value=${stage.name}
            @input=${updateTitle}
          >
          </pr-textarea>
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
          <group-chat-editor .stage=${stage}></group-chat-editor>
        `;
      case StageKind.PRIVATE_CHAT:
        return html` <base-stage-editor .stage=${stage}></base-stage-editor> `;
      case StageKind.FLIPCARD:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <flipcard-editor .stage=${stage}></flipcard-editor>
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
      case StageKind.ROLE:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <role-editor .stage=${stage}></role-editor>
        `;
      case StageKind.STOCKINFO:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <stockinfo-editor .stage=${stage}></stockinfo-editor>
        `;
      case StageKind.ASSET_ALLOCATION:
        return html`
          <base-stage-editor .stage=${stage}></base-stage-editor>
          <asset-allocation-editor .stage=${stage}></asset-allocation-editor>
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
        return html` Stage editor not found. `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-builder': ExperimentBuilder;
  }
}
