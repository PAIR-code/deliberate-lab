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
import {AuthService} from '../../services/auth.service';
import {ExperimentService} from '../../services/experiment.service';
import {AgentEditor} from '../../services/agent.editor';
import {RouterService} from '../../services/router.service';

import {AgentConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './experimenter_panel.scss';
import {DEFAULT_STRING_FORMATTING_INSTRUCTIONS} from '@deliberation-lab/utils';
import {DEFAULT_JSON_FORMATTING_INSTRUCTIONS} from '@deliberation-lab/utils';

enum PanelView {
  MANUAL_CHAT = 'manual_chat',
  LLM_SETTINGS = 'llm_settings',
  API_KEY = 'api_key',
}

/** Experimenter panel component */
@customElement('experimenter-panel')
export class Panel extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly agentEditor = core.getService(AgentEditor);
  private readonly routerService = core.getService(RouterService);

  @state() panelView: PanelView = PanelView.MANUAL_CHAT;
  @state() isLoading = false;

  override render() {
    if (!this.authService.isExperimenter) {
      return nothing;
    }

    // Check if chat stage
    const stageId = this.routerService.activeRoute.params['stage'];
    const stage = this.experimentService.getStage(stageId);

    if (stage?.kind !== StageKind.CHAT) {
      return nothing;
    }

    const panelClasses = classMap({
      'panel-wrapper': true,
      closed: !this.routerService.isExperimenterPanelOpen,
    });

    const isPanelOpen = this.routerService.isExperimenterPanelOpen;

    const renderPanelView = () => {
      if (!isPanelOpen) {
        return nothing;
      }
      switch (this.panelView) {
        case PanelView.MANUAL_CHAT:
          return html`
            <div class="main">
              <div class="top">
                <div class="header">Manual chat</div>
              </div>
              <div class="bottom">
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
                  ? html`<div>No agents configured</div>`
                  : nothing}
                ${agents.map((agent, index) =>
                  this.renderAgentEditor(stageId, agent, index)
                )}
              </div>
            </div>
          `;
        default:
          return nothing;
      }
    };

    const isSelected = (panelView: PanelView) => {
      return isPanelOpen && this.panelView === panelView;
    };

    return html`
      <div class=${panelClasses}>
        <div class="sidebar">
          <pr-tooltip text="Toggle experimenter panel" position="LEFT_END">
            <pr-icon-button
              color="secondary"
              icon=${isPanelOpen ? 'chevron_right' : 'chevron_left'}
              size="medium"
              variant="default"
              @click=${this.togglePanel}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Send manual chat" position="LEFT_END">
            <pr-icon-button
              color="secondary"
              icon="chat"
              size="medium"
              variant=${isSelected(PanelView.MANUAL_CHAT) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.MANUAL_CHAT;
                this.routerService.setExperimenterPanel(true);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Edit API key" position="LEFT_END">
            <pr-icon-button
              color="secondary"
              icon="key"
              size="medium"
              variant=${isSelected(PanelView.API_KEY) ? 'tonal' : 'default'}
              @click=${() => {
                this.panelView = PanelView.API_KEY;
                this.routerService.setExperimenterPanel(true);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
          <pr-tooltip text="Coming soon: Edit LLM config" position="LEFT_END">
            <pr-icon-button
              color="secondary"
              icon="edit_note"
              size="medium"
              variant=${isSelected(PanelView.LLM_SETTINGS)
                ? 'tonal'
                : 'default'}
              @click=${() => {
                this.panelView = PanelView.LLM_SETTINGS;
                this.routerService.setExperimenterPanel(true);
              }}
            >
            </pr-icon-button>
          </pr-tooltip>
        </div>
        ${renderPanelView()}
      </div>
    `;
  }

  private togglePanel() {
    this.routerService.setExperimenterPanel(
      !this.routerService.isExperimenterPanelOpen
    );
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
}

declare global {
  interface HTMLElementTagNameMap {
    'experimenter-panel': Panel;
  }
}
