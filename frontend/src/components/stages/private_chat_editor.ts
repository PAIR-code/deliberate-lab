import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

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
      ${this.renderTimeLimit()} ${this.renderPreventCancellation()}
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

  private renderTimeLimit() {
    const timeLimit = this.stage?.timeLimitInMinutes ?? null;

    const updateCheck = () => {
      if (!this.stage) return;
      if (this.stage.timeLimitInMinutes) {
        this.experimentEditor.updateStage({
          ...this.stage,
          timeLimitInMinutes: null,
          timeMinimumInMinutes: null,
        });
      } else {
        this.experimentEditor.updateStage({
          ...this.stage,
          timeLimitInMinutes: 20, // Default to 20 if checked
        });
      }
    };

    const updateMaxTime = (e: InputEvent) => {
      if (!this.stage) return;
      const timeLimit = Math.floor(
        Number((e.target as HTMLTextAreaElement).value),
      );
      this.experimentEditor.updateStage({
        ...this.stage,
        timeLimitInMinutes: timeLimit,
      });
    };

    const updateMinTime = (e: InputEvent) => {
      if (!this.stage) return;
      const val = Math.floor(Number((e.target as HTMLInputElement).value));
      const max = this.stage.timeLimitInMinutes;
      const clamped = max !== null ? Math.min(val, max) : val;
      this.experimentEditor.updateStage({
        ...this.stage,
        timeMinimumInMinutes: clamped > 0 ? clamped : null,
      });
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${timeLimit !== null}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>Disable conversation after a fixed amount of time</div>
        </div>
        ${timeLimit !== null
          ? html`
              <div class="number-input tab">
                <label for="timeLimit">
                  Maximum time in minutes (starting at first message)
                </label>
                <input
                  type="number"
                  id="timeLimit"
                  name="timeLimit"
                  min="0"
                  step="1"
                  .value=${timeLimit}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @input=${updateMaxTime}
                />
              </div>
              <div class="number-input tab tab-bottom">
                <label for="timeMinimum">
                  Minimum time participants must stay (in minutes)
                </label>
                <input
                  type="number"
                  id="timeMinimum"
                  name="timeMinimum"
                  min="0"
                  step="1"
                  .max=${timeLimit ?? ''}
                  .value=${this.stage?.timeMinimumInMinutes ?? ''}
                  placeholder="No minimum"
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @input=${updateMinTime}
                />
              </div>
            `
          : nothing}
      </div>
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

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const value = Number((e.target as HTMLInputElement).value);
      this.experimentEditor.updateStage({
        ...this.stage,
        minNumberOfTurns: Math.max(0, value),
      });
    };

    return html`
      <div class="config-item">
        <div class="number-input">
          <label for="minTurns">
            Minimum number of participant messages required (0 = no minimum)
          </label>
          <input
            type="number"
            id="minTurns"
            name="minTurns"
            min="0"
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

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const value = (e.target as HTMLInputElement).value;
      // If empty string, set to null; otherwise parse as number (minimum 1)
      this.experimentEditor.updateStage({
        ...this.stage,
        maxNumberOfTurns: value === '' ? null : Math.max(1, Number(value)),
      });
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
