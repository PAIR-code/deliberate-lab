import '../../pair-components/icon_button';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AgentEditor} from '../../services/agent.editor';

import {
  AgentPersonaConfig,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './stage_builder_dialog.scss';

/** Base agent prompt dialog */
@customElement('base-agent-prompt-dialog')
export class BaseAgentPromptDialog extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly agentEditor = core.getService(AgentEditor);

  @property() agentConfig: AgentPersonaConfig | undefined = undefined;
  @property() stageConfig: StageConfig | undefined = undefined;

  override render() {
    return html`
      <div class="dialog full">
        <div class="header">
          <div class="title">${this.stageConfig?.name} (advanced settings)</div>
          <pr-icon-button
            color="neutral"
            icon="close"
            variant="default"
            @click=${() => {
              this.agentEditor.setActiveStageId('');
            }}
          >
          </pr-icon-button>
        </div>
        <div class="body">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'base-agent-prompt-dialog': BaseAgentPromptDialog;
  }
}
