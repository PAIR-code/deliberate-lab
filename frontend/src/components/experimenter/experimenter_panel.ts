import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../../pair-components/tooltip';

import './experimenter_data_editor';
import './experimenter_manual_chat';

import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {ButtonClick, AnalyticsService} from '../../services/analytics.service';
import {AuthService} from '../../services/auth.service';
import {ExperimentManager} from '../../services/experiment.manager';
import {ExperimentService} from '../../services/experiment.service';
import {AgentEditor} from '../../services/agent.editor';
import {ParticipantService} from '../../services/participant.service';
import {RouterService} from '../../services/router.service';

import {AgentConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './experimenter_panel.scss';
import {DEFAULT_STRING_FORMATTING_INSTRUCTIONS} from '@deliberation-lab/utils';
import {DEFAULT_JSON_FORMATTING_INSTRUCTIONS} from '@deliberation-lab/utils';

enum PanelView {
  DEFAULT = 'default',
  MANUAL_CHAT = 'manual_chat',
  LLM_SETTINGS = 'llm_settings',
  API_KEY = 'api_key',
}

/** Experimenter panel component */
@customElement('experimenter-panel')
export class Panel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly analyticsService = core.getService(AnalyticsService);
  private readonly authService = core.getService(AuthService);
  private readonly experimentManager = core.getService(ExperimentManager);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly agentEditor = core.getService(AgentEditor);
  private readonly participantService = core.getService(ParticipantService);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.DEFAULT;
  @state() isLoading = false;
  @state() isDownloading = false;

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    const stageId = this.participantService.currentStageViewId ?? '';
    const stage = this.experimentService.getStage(stageId);

    const renderPanelView = () => {
      switch (this.panelView) {
        case PanelView.MANUAL_CHAT:
          if (stage?.kind !== StageKind.CHAT) {
            return html`
              <div class="main">
                <div class="top">
                  <div class="header">Manual chat</div>
                  <div>Navigate to a chat stage preview to send a message.</div>
                </div>
              </div>
            `;
          }
          return html`
            <div class="main">
              <div class="top">
                <div class="header">Manual chat</div>
                <experimenter-manual-chat></experimenter-manual-chat>
              </div>
            </div>
          `;
        case PanelView.API_KEY:
          return html`
            <div class="main">
              <div class="top">
                <div class="header">Experimenter settings</div>
                <experimenter-data-editor></experimenter-data-editor>
              </div>
            </div>
          `;
        case PanelView.LLM_SETTINGS:
          const agents = this.agentEditor.getAgents(stageId);
          return html`
            <div class="main">
              <div class="top">
                <div class="header">Agent config</div>
                ${agents.length === 0
                  ? html`<div>No agents configured in the current stage</div>`
                  : nothing}
                ${agents.map((agent, index) =>
                  this.renderAgentEditor(stageId, agent, index)
                )}
              </div>
            </div>
          `;
        default:
          const showCohortList = this.experimentManager.showCohortList;
          const showPreview = this.experimentManager.showParticipantPreview;
          const showStats = this.experimentManager.showParticipantStats;
          return html`
            <div class="main">
              <div class="top">
                <div class="header">Cohort Panel</div>
                <div class="checkbox-wrapper"
                  @click=${() => { this.experimentManager.setShowCohortList(!showCohortList) }}
                >
                  <pr-icon-button
                    color="tertiary"
                    size="medium"
                    variant="default"
                    icon=${showCohortList ? 'check_box' : 'check_box_outline_blank'}
                  >
                  </pr-icon-button>
                  <div>
                    Show cohort list
                  </div>
                </div>
                <div class="header">Participant panels</div>
                <div class="checkbox-wrapper"
                  @click=${() => { this.experimentManager.setShowParticipantStats(!showStats) }}
                >
                  <pr-icon-button
                    color="tertiary"
                    size="medium"
                    variant="default"
                    icon=${showStats ? 'check_box' : 'check_box_outline_blank'}
                  >
                  </pr-icon-button>
                  <div>
                    Show participant details
                  </div>
                </div>
                <div class="checkbox-wrapper"
                  @click=${() => { this.experimentManager.setShowParticipantPreview(!showPreview) }}
                >
                  <pr-icon-button
                    color="tertiary"
                    size="medium"
                    variant="default"
                    icon=${showPreview ? 'check_box' : 'check_box_outline_blank'}
                  >
                  </pr-icon-button>
                  <div>
                    Show participant preview
                  </div>
                </div>
              </div>
              <div class="bottom">
                <div class="header">Actions</div>
                ${this.renderExperimentActions()}
              </div>
            </div>
          `;
      }
    };

    const isSelected = (panelView: PanelView) => {
      return this.panelView === panelView;
    };

    return html`
      <div class="panel-wrapper">
        <div class="sidebar">
          <pr-tooltip text="Dashboard settings" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="tune"
              size="medium"
              variant=${isSelected(PanelView.DEFAULT) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.DEFAULT;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Send manual chat" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="forum"
              size="medium"
              variant=${isSelected(PanelView.MANUAL_CHAT) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.MANUAL_CHAT;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Edit API key" position="RIGHT_END">
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
          <pr-tooltip text="Edit agent configs" position="RIGHT_END">
            <pr-icon-button
              color="secondary"
              icon="robot_2"
              size="medium"
              variant=${isSelected(PanelView.LLM_SETTINGS)
                ? 'tonal'
                : 'default'}
              @click=${() => {
                this.panelView = PanelView.LLM_SETTINGS;
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
        ${renderPanelView()}
      </div>
    `;
  }

  private renderAgentEditor(
    stageId: string,
    agent: AgentConfig,
    index: number
  ) {
    const updatePrompt = (e: InputEvent) => {
      const prompt = (e.target as HTMLTextAreaElement).value;
      this.agentEditor.updateAgent(stageId, {...agent, prompt}, index);
    };
    const updateFormattingInstructions = (e: InputEvent) => {
      const instructions = (e.target as HTMLTextAreaElement).value;
      const responseConfig = {
        ...agent.responseConfig,
        formattingInstructions: instructions,
      };
      this.agentEditor.updateAgent(
        stageId,
        {...agent, responseConfig},
        index
      );
    };

    const updateJSON = () => {
      const responseConfig = {
        ...agent.responseConfig,
        isJSON: !agent.responseConfig.isJSON,
        formattingInstructions: agent.responseConfig.isJSON
          ? DEFAULT_STRING_FORMATTING_INSTRUCTIONS
          : DEFAULT_JSON_FORMATTING_INSTRUCTIONS,
      };
      this.agentEditor.updateAgent(
        stageId,
        {...agent, responseConfig},
        index
      );
    };

    const updateWPM = (e: InputEvent) => {
      const wpm = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(wpm)) {
        this.agentEditor.updateAgent(
          stageId,
          {...agent, wordsPerMinute: wpm},
          index
        );
      }
    };

    return html`
      <div class="agent">
        <div class="agent-title">#${index + 1} - ${agent.name}</div>
        <div class="debug">${JSON.stringify(agent.responseConfig)}</div>
        Prompt:
        <div class="prompt-box">
          <pr-textarea
            placeholder="Custom prompt for agent"
            .value=${agent.prompt}
            @input=${updatePrompt}
          >
          </pr-textarea>
        </div>
        Formatting instructions and examples:
        <div class="prompt-box">
          <pr-textarea
            placeholder="Custom formatting instructions for agent"
            .value=${agent.responseConfig.formattingInstructions}
            @input=${updateFormattingInstructions}
          >
          </pr-textarea>
        </div>
        <div>
          Words per minute (WPM):
          <div class="wpm-box">
            <input
              type="number"
              .value=${agent.wordsPerMinute ?? ''}
              placeholder="Enter WPM"
              @input=${updateWPM}
            />
          </div>
        </div>
        <div>
          <div class="action-bar">
            <div class="checkbox-wrapper">
              <md-checkbox
                touch-target="wrapper"
                ?checked=${agent.responseConfig.isJSON}
                @click=${updateJSON}
              >
              </md-checkbox>
              <div>Parse as JSON</div>
            </div>
            <pr-button
              color="secondary"
              padding="small"
              size="small"
              variant="tonal"
              ?loading=${this.isLoading}
              @click=${async () => {
                this.isLoading = true;
                await this.agentEditor.saveChatAgents(stageId);
                this.isLoading = false;
              }}
            >
              Update prompt
            </pr-button>
          </div>
        </div>
        <div class="debug error">
          Warning: Saving edits will update the agent across all experiment
          cohorts
        </div>
      </div>
    `;
  }

  private renderExperimentDownloadButton() {
    const onClick = async () => {
      this.isDownloading = true;
      await this.experimentManager.downloadExperiment();
      this.isDownloading = false;
    };

    return html`
      <pr-button
        color="secondary"
        variant="outlined"
        ?loading=${this.isDownloading}
        @click=${onClick}
      >
        <pr-icon
          icon="download"
          color="secondary"
          variant="default"
        >
        </pr-icon>
        <div>Download experiment data</div>
      </pr-button>
    `;
  }

  private renderExperimentForkButton() {
    const onClick = () => {
      // Display confirmation dialog
      const isConfirmed = window.confirm(
        'This will create a copy of this experiment. Are you sure you want to proceed?'
      );
      if (!isConfirmed) return;
      this.analyticsService.trackButtonClick(
        ButtonClick.EXPERIMENT_FORK
      );
      this.experimentManager.forkExperiment();
    };

    return html`
      <pr-button
        color="secondary"
        variant="outlined"
        @click=${onClick}
      >
        <pr-icon
          icon="fork_right"
          color="secondary"
          variant="default"
        >
        </pr-icon>
        <div>Fork experiment</div>
      </pr-button>
    `;
  }

  private renderExperimentEditButton() {
    const tooltip = `
      Experiment creators can edit metadata any time
      + can edit stages if users have not joined the experiment.`;

    const onClick = () => {
      this.analyticsService.trackButtonClick(
        this.experimentManager.isCreator
          ? ButtonClick.EXPERIMENT_EDIT
          : ButtonClick.EXPERIMENT_PREVIEW_CONFIG
      );
      this.experimentManager.setIsEditing(true);
    };

    return html`
      <pr-tooltip text=${tooltip} position="TOP_START">
        <pr-button
          color="secondary"
          variant="outlined"
          @click=${onClick}
        >
          <pr-icon
            icon=${this.experimentManager.isCreator ? 'edit_note' : 'overview'}
            color="secondary"
            variant="default"
          >
          </pr-icon>
          <div>Edit experiment</div>
        </pr-button>
      </pr-tooltip>
    `;
  }

  private renderExperimentActions() {
    return html`
      ${this.renderExperimentDownloadButton()}
      ${this.renderExperimentForkButton()}
      ${this.renderExperimentEditButton()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-panel': Panel;
  }
}
