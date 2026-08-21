import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';
import {renderTimeLimit} from '../../shared/stage.utils';

import {PrivateChatStageConfig} from '@deliberation-lab/utils';

import {styles} from './group_chat_editor.scss';

@customElement('private-chat-editor')
export class ChatEditor extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: PrivateChatStageConfig | undefined = undefined;

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
      ${this.renderPreventCancellation()}
      <div class="divider"></div>
      <div class="title">Message limits</div>
      ${this.renderTurnBasedChat()} ${this.renderMinNumberOfTurns()}
      ${this.renderMaxNumberOfTurns()}
      <div class="divider"></div>
      <div class="title">Agent mediators</div>
      <div class="description">
        Navigate to "Agent mediators" tab to add or edit mediators
      </div>
      ${this.renderMediators()}
    `;
  }

  private renderPreventCancellation() {
    const preventCancellation = this.stage?.preventCancellation ?? false;

    const updateCheck = (e: Event) => {
      if (!this.stage) return;
      this.experimentEditor.updateStage({
        ...this.stage,
        preventCancellation: (e.target as HTMLInputElement).checked,
      });
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${preventCancellation}
            ?disabled=${!this.experimentEditor.canEditStages}
            @change=${updateCheck}
          >
          </md-checkbox>
          <div>
            Prevent cancellation of pending requests (stops gaming of minimum
            message counts)
          </div>
        </div>
      </div>
    `;
  }

  private renderTurnBasedChat() {
    const isTurnBasedChat = this.stage?.isTurnBasedChat ?? true;

    const updateCheck = () => {
      if (!this.stage) return;
      this.experimentEditor.updateStage({
        ...this.stage,
        isTurnBasedChat: !isTurnBasedChat,
      });
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isTurnBasedChat}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>
            Turn-based chat (participant and mediator alternate messages)
          </div>
        </div>
      </div>
    `;
  }

  private renderMinNumberOfTurns() {
    const minNumberOfTurns = this.stage?.minNumberOfTurns ?? 0;

    const maxNumberOfTurns = this.stage?.maxNumberOfTurns ?? null;

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      let value = Math.max(0, Number((e.target as HTMLInputElement).value));
      if (maxNumberOfTurns !== null) {
        value = Math.min(value, maxNumberOfTurns);
      }
      this.experimentEditor.updateStage({
        ...this.stage,
        minNumberOfTurns: value,
      });
    };

    return html`
      <div class="config-item">
        <div class="number-input">
          <label for="minTurns">
            Minimum number of participant messages required (0 = no minimum).
            Takes precedence over maximum time limit.
          </label>
          <input
            type="number"
            id="minTurns"
            name="minTurns"
            min="0"
            .max=${maxNumberOfTurns ?? ''}
            .value=${minNumberOfTurns}
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateNum}
          />
        </div>
      </div>
    `;
  }

  private renderMaxNumberOfTurns() {
    const maxNumberOfTurns = this.stage?.maxNumberOfTurns;

    const minNumberOfTurns = this.stage?.minNumberOfTurns ?? 0;

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const value = (e.target as HTMLInputElement).value;
      if (value === '') {
        this.experimentEditor.updateStage({
          ...this.stage,
          maxNumberOfTurns: null,
        });
      } else {
        const num = Math.max(minNumberOfTurns, Math.max(1, Number(value)));
        this.experimentEditor.updateStage({
          ...this.stage,
          maxNumberOfTurns: num,
        });
      }
    };

    return html`
      <div class="config-item">
        <div class="number-input">
          <label for="maxTurns">
            Maximum number of participant messages (empty = no limit)
          </label>
          <input
            type="number"
            id="maxTurns"
            name="maxTurns"
            min="1"
            .value=${maxNumberOfTurns ?? ''}
            placeholder="No limit"
            ?disabled=${!this.experimentEditor.canEditStages}
            @input=${updateNum}
          />
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
    'private-chat-editor': ChatEditor;
  }
}
