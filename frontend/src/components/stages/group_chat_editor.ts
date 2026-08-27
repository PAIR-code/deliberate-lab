import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {ExperimentEditor} from '../../services/experiment.editor';
import {renderTimeLimit} from '../../shared/stage.utils';

import {ChatStageConfig} from '@deliberation-lab/utils';

import {styles} from './group_chat_editor.scss';

/** Chat editor for configuring agents. */
@customElement('group-chat-editor')
export class ChatEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);
  private readonly authService = core.getService(AuthService);

  @property() stage: ChatStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="title">Conversation settings</div>
      ${renderTimeLimit({
        stage: this.stage,
        canEdit: this.experimentEditor.canEditStages,
        onStageChange: (stage) => this.experimentEditor.updateStage(stage),
      })}
      ${this.renderTurnBasedSetting()} ${this.renderReactionsSetting()}
      <div class="divider"></div>
      <div class="title">Agent mediators</div>
      <div class="description">
        Navigate to "Agent mediators" tab to add or edit mediators
      </div>
      ${this.renderMediators()}
    `;
  }

  private renderTurnBasedSetting() {
    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${this.stage?.isTurnBased ?? false}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              this.experimentEditor.updateStage({
                ...this.stage!,
                isTurnBased: checked,
              });
            }}
          >
          </md-checkbox>
          <div>
            Turn-based conversation: Each participant speaks in a random order,
            beginning with the mediators if at least one is present.
          </div>
        </div>
      </div>
    `;
  }

  private renderReactionsSetting() {
    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${this.stage?.enableReactionsAndReplies ?? false}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              this.experimentEditor.updateStage({
                ...this.stage!,
                enableReactionsAndReplies: checked,
              });
            }}
          >
          </md-checkbox>
          <div>
            Reactions and replies: Allow participants to react to and reply to
            each other's messages.
          </div>
        </div>
      </div>
    `;
  }

  private renderMediators() {
    const agentMediators = this.experimentEditor.agentMediators.filter(
      (template) => template.promptMap[this.stage?.id ?? ''],
    );

    if (agentMediators.length === 0) {
      return html`
        <div class="error-message">No mediators added to this stage</div>
      `;
    }

    return html`
      <div class="card-grid">
        ${agentMediators.map(
          (mediator) => html`
            <div class="mediator-card">
              <div class="mediator-card-title">
                ${mediator.persona.defaultProfile.avatar}
                ${mediator.persona.defaultProfile.name ??
                `Agent ${mediator.persona.id}`}
              </div>
              <div class="description">${mediator.persona.description}</div>
            </div>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-chat-editor': ChatEditor;
  }
}
