import '../../pair-components/button';
import '../../pair-components/icon';
import '../../pair-components/icon_button';
import '../shared/agent_model_selector';

import '@material/web/textfield/filled-text-field.js';
import '@material/web/checkbox/checkbox.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import 'emoji-picker-element';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';
import {ExperimentService} from '../../services/experiment.service';

import {
  AgentModelSettings,
  AgentPersonaConfig,
  AgentPersonaType,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {LLM_AGENT_AVATARS} from '../../shared/constants';
import {getHashBasedColor} from '../../shared/utils';

import {styles} from './agent_editor.scss';

/** Editor for configuring agent persona data. */
@customElement('agent-persona-editor')
export class AgentPersonaEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly experimentService = core.getService(ExperimentService);

  @property() agent: AgentPersonaConfig | undefined = undefined;
  @state() isTestButtonLoading = false;

  override render() {
    if (!this.agent) {
      return html`
        <div class="agent-wrapper">
          <div>Select an agent to edit.</div>
        </div>
      `;
    }

    const agentConfig = this.agent;
    // TODO: Add API key check
    return html`
      <div class="agent-wrapper">
        ${this.renderAgentPrivateName(agentConfig)}
        ${this.renderAgentPrivateDescription(agentConfig)}
        ${this.renderAgentName(agentConfig)} ${this.renderAvatars(agentConfig)}
        ${this.renderModelSelector(agentConfig)}
        ${this.renderMediatorCohortPreference(agentConfig)}
      </div>
      <div class="divider main">
        <slot></slot>
      </div>
      <div class="agent-wrapper">
        ${this.renderDeleteAgentButton(agentConfig)}
      </div>
    `;
  }

  private renderDeleteAgentButton(agent: AgentPersonaConfig) {
    const onClick = () => {
      if (agent.type === AgentPersonaType.MEDIATOR) {
        this.experimentEditor.deleteAgentMediator(agent.id);
      } else if (agent.type === AgentPersonaType.PARTICIPANT) {
        this.experimentEditor.deleteAgentParticipant(agent.id);
      }
    };

    return html`
      <pr-button
        color="error"
        variant="outlined"
        @click=${onClick}
        ?disabled=${!this.experimentEditor.canEditStages}
      >
        Delete agent
        ${agent.type === AgentPersonaType.MEDIATOR ? 'mediator' : 'participant'}
        persona
      </pr-button>
    `;
  }

  private updatePersona(updatedPersona: Partial<AgentPersonaConfig>) {
    const agent = this.agent;
    if (!agent) return;

    if (agent.type === AgentPersonaType.MEDIATOR) {
      this.experimentEditor.updateAgentMediatorPersona(agent.id, {
        ...agent,
        ...updatedPersona,
        type: AgentPersonaType.MEDIATOR,
      });
    } else if (agent.type === AgentPersonaType.PARTICIPANT) {
      this.experimentEditor.updateAgentParticipantPersona(agent.id, {
        ...agent,
        ...updatedPersona,
        type: AgentPersonaType.PARTICIPANT,
      });
    }
  }

  private renderAgentPrivateName(agent: AgentPersonaConfig) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.updatePersona({name});
    };

    return html`
      <md-filled-text-field
        label="Private agent name (viewable to experimenters only)"
        .value=${agent.name}
        class=${agent.name.length === 0 ? 'required' : ''}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </md-filled-text-field>
    `;
  }

  private renderAgentPrivateDescription(agent: AgentPersonaConfig) {
    const updateDescription = (e: InputEvent) => {
      const description = (e.target as HTMLTextAreaElement).value;
      this.updatePersona({description});
    };

    return html`
      <md-filled-text-field
        type="textarea"
        label="Description (viewable to experimenters only)"
        .value=${agent.description}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateDescription}
      >
      </md-filled-text-field>
    `;
  }

  private renderAgentName(agent: AgentPersonaConfig) {
    const updateName = (e: InputEvent) => {
      const name = (e.target as HTMLTextAreaElement).value;
      this.updatePersona({
        defaultProfile: {...agent.defaultProfile, name},
      });
    };

    return html`
      <md-filled-text-field
        required
        label="Display name for agent"
        .error=${!agent.defaultProfile.name}
        .value=${agent.defaultProfile.name}
        ?disabled=${!this.experimentEditor.canEditStages}
        @input=${updateName}
      >
      </md-filled-text-field>
    `;
  }

  private renderModelSelector(agent: AgentPersonaConfig) {
    const handleSettingsChange = (e: CustomEvent<AgentModelSettings>) => {
      this.updatePersona({defaultModelSettings: e.detail});
    };

    return html`
      <agent-model-selector
        .apiType=${agent.defaultModelSettings.apiType}
        .modelName=${agent.defaultModelSettings.modelName}
        ?disabled=${!this.experimentEditor.canEditStages}
        @model-settings-change=${handleSettingsChange}
      ></agent-model-selector>
    `;
  }

  private renderMediatorCohortPreference(agent: AgentPersonaConfig) {
    if (agent.type !== AgentPersonaType.MEDIATOR) {
      return nothing;
    }

    const togglePreference = (event: Event) => {
      const checked = (event.target as HTMLInputElement).checked;
      this.updatePersona({isDefaultAddToCohort: checked});
    };

    return html`
      <div class="checkbox-wrapper">
        <md-checkbox
          touch-target="wrapper"
          ?checked=${agent.isDefaultAddToCohort}
          ?disabled=${!this.experimentEditor.canEditStages}
          @change=${togglePreference}
        >
        </md-checkbox>
        <div>Automatically add this mediator to every cohort</div>
      </div>
    `;
  }

  private handleAvatarChange(event: CustomEvent) {
    if (!this.agent) {
      return;
    }
    const emoji = event.detail.unicode;
    this.updatePersona({
      defaultProfile: {...this.agent.defaultProfile, avatar: emoji},
    });
  }

  private renderAvatars(agent: AgentPersonaConfig) {
    return html`
      <div class="form-field">
        <label for="avatar">Avatar</label>
        <emoji-picker @emoji-click=${this.handleAvatarChange}></emoji-picker>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agent-persona-editor': AgentPersonaEditorComponent;
  }
}
