import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';
import '../experimenter/experimenter_data_editor';
import '../stages/asset_allocation_editor';
import '../stages/base_stage_editor';
import '../stages/comprehension_editor';
import '../stages/group_chat_editor';
import '../stages/private_chat_editor';
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
import './variable_editor';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {AnalyticsService, ButtonClick} from '../../services/analytics.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentManager} from '../../services/experiment.manager';
import {Pages, RouterService} from '../../services/router.service';

import {
  StageConfig,
  StageKind,
  extractVariablesFromVariableConfigs,
  formatInvalidVariable,
  generateId,
  validateTemplateVariables,
} from '@deliberation-lab/utils';

import {styles} from './experiment_builder.scss';

enum PanelView {
  AGENT_MEDIATORS = 'agent_mediators',
  API_KEY = 'api_key',
  COHORT = 'cohort',
  METADATA = 'metadata',
  PERMISSIONS = 'permissions',
  PROLIFIC = 'prolific',
  STAGES = 'stages',
  VARIABLES = 'variables',
}

/** Experiment builder used to create/edit experiments */
@customElement('experiment-builder')
export class ExperimentBuilder extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.STAGES;

  override render() {
    return html`
      ${this.renderPanelView()} ${this.renderExperimentConfigBuilder()}
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

  private renderPanelView() {
    return html`
      <div class="panel-wrapper">
        <div class="panel-view">
          <div class="top">
            <div class="panel-view-header">
              <div class="header-title">General settings</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.METADATA ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.METADATA;
              }}
            >
              <div>Metadata</div>
              <div class="subtitle">Experiment name and description</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.STAGES ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.STAGES;
              }}
            >
              <div>Experiment stages</div>
              <div class="subtitle">Add and configure experiment stages</div>
            </div>
            <div class="panel-view-header">
              <div class="header-title">Additional settings</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.PERMISSIONS ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.PERMISSIONS;
              }}
            >
              <div>Permissions</div>
              <div class="subtitle">Set visibility of experiment dashboard</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.PROLIFIC ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.PROLIFIC;
              }}
            >
              <div>Prolific integration</div>
              <div class="subtitle">Set up Prolific codes</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.COHORT ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.COHORT;
              }}
            >
              <div>Cohort setup</div>
              <div class="subtitle">Specify default cohort settings</div>
            </div>
            <div class="panel-view-header">
              <div class="header-title">LLM settings</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.API_KEY ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.API_KEY;
              }}
            >
              <div>API key</div>
              <div class="subtitle">Configure API key used for agent calls</div>
            </div>
            <div
              class="general-item ${
                this.panelView === PanelView.AGENT_MEDIATORS ? 'current' : ''
              }"
              @click=${() => {
                this.panelView = PanelView.AGENT_MEDIATORS;
                this.experimentEditor.setAgentIdToLatest(true);
              }}
            >
              <div>Agent mediators</div>
              <div class="subtitle">Add and configure agent mediators</div>
            </div>
            ${this.authService.showAlphaFeatures ? this.renderAlphaMenuItems() : nothing}
            </div>
            <div class="bottom">
              <alpha-toggle></alpha-toggle>
              ${this.renderDeleteButton()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAlphaMenuItems() {
    return html`
      <div class="panel-view-header">
        <div class="header-title">Alpha features</div>
      </div>
      <div
        class="general-item ${this.panelView === PanelView.VARIABLES
          ? 'current'
          : ''}"
        @click=${() => {
          this.panelView = PanelView.VARIABLES;
        }}
      >
        <div>Variables <span class="alpha">alpha</span></div>
        <div class="subtitle">Set up variables to use in stage text</div>
      </div>
    `;
  }

  private renderAddMediatorButton() {
    const disabled =
      this.experimentEditor.getMediatorAllowedStages().length === 0;
    const tooltipText = disabled
      ? 'No mediator-compatible stages have been added to this experiment. Add a mediator-compatible stage (e.g., chat) to enable this.'
      : '';

    return html`
      <pr-tooltip text=${tooltipText} position="BOTTOM_END">
        <pr-button
          icon="person_add"
          color="tertiary"
          variant="tonal"
          ?disabled=${disabled}
          aria-disabled=${disabled ? 'true' : 'false'}
          @click=${() => {
            if (disabled) return;
            this.experimentEditor.addAgentMediator();
          }}
        >
          + Add agent mediator persona
        </pr-button>
      </pr-tooltip>
    `;
  }

  private renderAddParticipantButton() {
    return html`
      <pr-button
        icon="person_add"
        color="tertiary"
        variant="tonal"
        @click=${() => {
          this.experimentEditor.addAgentParticipant();
        }}
      >
        + Add agent participant persona
      </pr-button>
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
        <div class="content padding">
          <experimenter-data-editor></experimenter-data-editor>
        </div>
      </div>
    `;
  }

  private renderExperimentConfigBuilder() {
    if (this.panelView === PanelView.METADATA) {
      return html`
        <div class="experiment-builder">
          <experiment-metadata-editor></experiment-metadata-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.PERMISSIONS) {
      return html`
        <div class="experiment-builder">
          <experiment-permissions-editor></experiment-permissions-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.VARIABLES) {
      return html`
        <div class="experiment-builder">
          <variable-editor></variable-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.PROLIFIC) {
      return html`
        <div class="experiment-builder">
          <experiment-prolific-editor></experiment-prolific-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.COHORT) {
      return html`
        <div class="experiment-builder">
          <experiment-cohort-editor></experiment-cohort-editor>
        </div>
      `;
    } else if (this.panelView === PanelView.AGENT_MEDIATORS) {
      return this.renderAgentMediatorsBuilder();
    } else if (this.panelView === PanelView.STAGES) {
      return this.renderStageBuilder();
    }
    return nothing;
  }

  // WARNING: Do not use this as we are not currently permitting agent
  // participant personas to be set in the editor. Rather, agent participants
  // are defined on the spot in the experiment dashboard and will use
  // a default set of prompts (see PR #864)
  private renderAgentParticipantsBuilder() {
    const agent = this.experimentEditor.currentAgent;
    const name = agent?.persona.name;
    return html`
      <div class="sidenav">
        <div class="sidenav-header">${this.renderAddParticipantButton()}</div>
        <div class="sidenav-items">
          <div class="subtitle warning">
            ⚠️ Agent participant are in alpha mode and may not work as expected.
          </div>
          ${this.experimentEditor.agentParticipants.map(
            (agent) => html`
              <div
                class="agent-item ${this.experimentEditor.currentAgentId ===
                agent.persona.id
                  ? 'current'
                  : ''}"
                @click=${() => {
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
      </div>
      <div class="experiment-builder">
        <div class="header">
          ${name !== '' ? name : `Agent ${agent?.persona.id}`}
        </div>
        <div class="content">
          <agent-persona-editor .agent=${agent?.persona}>
          <br/>
          <div class="divider main">
          
          ${this.experimentEditor.stages.length === 0 ? '' : html`<div class="header">Stage-specific prompts</div>`}

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
      </div>
    `;
  }

  private renderAgentMediatorsBuilder() {
    const agent = this.experimentEditor.currentAgent;
    const name = agent?.persona.name;
    return html`
      <div class="sidenav">
        <div class="sidenav-header">${this.renderAddMediatorButton()}</div>
        <div class="sidenav-items">
          ${this.experimentEditor.agentMediators.map(
            (mediator) => html`
              <div
                class="agent-item ${this.experimentEditor.currentAgentId ===
                mediator.persona.id
                  ? 'current'
                  : ''}"
                @click=${() => {
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
        </div>
      </div>
      <div class="experiment-builder">
        <div class="header">
          ${name !== '' ? name : `Agent ${agent?.persona.id}`}
        </div>
        <div class="content">
          <agent-persona-editor .agent=${agent?.persona}>
            ${this.experimentEditor.stages.length === 0
              ? ''
              : html`<div class="header">Stage-specific prompts</div>`}
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
      </div>
    `;
  }

  private renderStageBuilder() {
    if (this.panelView !== PanelView.STAGES) {
      return nothing;
    }

    return html`
      <experiment-builder-nav></experiment-builder-nav>
      <div class="experiment-builder">
        <div class="header">${this.renderTitle()} ${this.renderActions()}</div>
        ${this.renderVariableCheck()}
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

  private renderVariableCheck() {
    const stage = this.experimentEditor.currentStage;
    const variableConfigs =
      this.experimentEditor.experiment?.variableConfigs ?? [];
    const {valid, invalidVariables} = validateTemplateVariables(
      JSON.stringify(stage),
      extractVariablesFromVariableConfigs(variableConfigs),
    );

    if (valid) {
      return nothing;
    }
    const errorText = invalidVariables
      .map((v) => formatInvalidVariable(v))
      .join('; ');
    return html` <div class="banner warning">⚠️ ${errorText}</div> `;
  }

  private renderContent() {
    const stage = this.experimentEditor.currentStage;

    if (stage === undefined) {
      return html`<div class="content padding">Select a stage to edit.</div>`;
    }

    switch (stage.kind) {
      case StageKind.INFO:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Info settings</div>
            <info-editor .stage=${stage}></info-editor>
          </base-stage-editor>
        `;
      case StageKind.PAYOUT:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Payout settings</div>
            <payout-editor .stage=${stage}></payout-editor>
          </base-stage-editor>
        `;
      case StageKind.PROFILE:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Profile settings</div>
            <profile-stage-editor .stage=${stage}></profile-stage-editor>
          </base-stage-editor>
        `;
      case StageKind.CHAT:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Chat settings</div>
            <group-chat-editor .stage=${stage}></group-chat-editor>
          </base-stage-editor>
        `;
      case StageKind.COMPREHENSION:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Comprehension questions</div>
            <comprehension-editor .stage=${stage}></comprehension-editor>
          </base-stage-editor>
        `;
      case StageKind.PRIVATE_CHAT:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Chat settings</div>
            <private-chat-editor .stage=${stage}></private-chat-editor>
          </base-stage-editor>
        `;
      case StageKind.FLIPCARD:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Flipcard settings</div>
            <flipcard-editor .stage=${stage}></flipcard-editor>
          </base-stage-editor>
        `;
      case StageKind.RANKING:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Ranking settings</div>
            <ranking-editor .stage=${stage}></ranking-editor>
          </base-stage-editor>
        `;
      case StageKind.REVEAL:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Reveal stages</div>
            <reveal-editor .stage=${stage}></reveal-editor>
          </base-stage-editor>
        `;
      case StageKind.ROLE:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Roles</div>
            <role-editor .stage=${stage}></role-editor>
          </base-stage-editor>
        `;
      case StageKind.STOCKINFO:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Stock settings</div>
            <stockinfo-editor .stage=${stage}></stockinfo-editor>
          </base-stage-editor>
        `;
      case StageKind.ASSET_ALLOCATION:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Asset allocation configuration</div>
            <asset-allocation-editor .stage=${stage}></asset-allocation-editor>
          </base-stage-editor>
        `;
      case StageKind.MULTI_ASSET_ALLOCATION:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Asset allocation configuration</div>
            <multi-asset-allocation-editor .stage=${stage}>
            </multi-asset-allocation-editor>
          </base-stage-editor>
        `;
      case StageKind.SURVEY:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Survey questions</div>
            <survey-editor .stage=${stage}></survey-editor>
          </base-stage-editor>
        `;
      case StageKind.SURVEY_PER_PARTICIPANT:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Survey questions</div>
            <survey-per-participant-editor .stage=${stage}>
            </survey-per-participant-editor>
          </base-stage-editor>
        `;
      case StageKind.TOS:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Terms of service</div>
            <tos-editor .stage=${stage}></tos-editor>
          </base-stage-editor>
        `;
      case StageKind.TRANSFER:
        return html`
          <base-stage-editor .stage=${stage}>
            <div slot="title">Transfer settings</div>
            <transfer-editor .stage=${stage}></transfer-editor>
          </base-stage-editor>
        `;
      default:
        return html` Stage editor not found. `;
    }
  }
}

@customElement('alpha-toggle')
export class AlphaToggle extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);

  override render() {
    return html`
      <div class="alpha-toggle">
        <span class="label">🧪 Show Alpha features</span>
        <label
          class="switch"
          title=${this.authService.showAlphaFeatures
            ? 'Alpha features enabled'
            : 'Alpha features disabled'}
        >
          <input
            type="checkbox"
            ?checked=${this.authService.showAlphaFeatures}
            @change=${(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              this.authService.updateAlphaToggle(checked);
            }}
          />
          <span class="slider"></span>
        </label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experiment-builder': ExperimentBuilder;
    'alpha-toggle': AlphaToggle;
  }
}
