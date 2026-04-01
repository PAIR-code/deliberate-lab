import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';

import {ExperimentEditor} from '../../services/experiment.editor';

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
      ${this.renderTimeLimit()}
      <div class="divider"></div>
      <div class="title">Agent mediators</div>
      <div class="description">
        Navigate to "Agent mediators" tab to add or edit mediators
      </div>
      ${this.renderMediators()}
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

  private renderTimeLimit() {
    const timeLimit = this.stage?.timeLimitInMinutes;

    const updateCheck = () => {
      const isSet = this.stage?.timeLimitInMinutes != null;
      this.experimentEditor.updateStage({
        ...this.stage!,
        timeLimitInMinutes: isSet ? null : 20,
        timeMinimumInMinutes: null,
      });
    };

    const updateMaxTime = (e: InputEvent) => {
      const val = (e.target as HTMLInputElement).valueAsNumber;
      const timeLimitInMinutes = val > 0 ? Math.floor(val) : null;
      this.experimentEditor.updateStage({
        ...this.stage!,
        timeLimitInMinutes,
      });
    };

    const updateMinTime = (e: InputEvent) => {
      const val = (e.target as HTMLInputElement).valueAsNumber;
      const minTime = val > 0 ? Math.floor(val) : null;
      const max = this.stage?.timeLimitInMinutes;
      const timeMinimumInMinutes =
        minTime != null && max != null ? Math.min(minTime, max) : minTime;
      this.experimentEditor.updateStage({
        ...this.stage!,
        timeMinimumInMinutes,
      });
    };

    return html`
      <div class="config-item">
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${timeLimit != null}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateCheck}
          >
          </md-checkbox>
          <div>Disable conversation after a fixed amount of time</div>
        </div>
        ${timeLimit != null
          ? html`
              <div class="number-input tab">
                <label for="timeLimit">
                  Maximum time in minutes (starting at first message).
                  Participant will remain in chat until minimum messages
                  requirement is met, even if maximum time has passed.
                </label>
                <input
                  type="number"
                  id="timeLimit"
                  name="timeLimit"
                  min="1"
                  step="1"
                  .value=${timeLimit}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @input=${updateMaxTime}
                />
              </div>
              <div class="number-input tab tab-bottom">
                <label for="timeMinimum">
                  Minimum time participants must stay (in minutes). Takes
                  precedence over maximum number of messages.
                </label>
                <input
                  type="number"
                  id="timeMinimum"
                  name="timeMinimum"
                  min="1"
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
}

declare global {
  interface HTMLElementTagNameMap {
    'group-chat-editor': ChatEditor;
  }
}
