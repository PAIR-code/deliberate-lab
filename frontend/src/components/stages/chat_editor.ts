import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';

import {ExperimentEditor} from '../../services/experiment.editor';

import {ChatStageConfig} from '@deliberation-lab/utils';

import {styles} from './chat_editor.scss';

/** Chat editor for configuring agents. */
@customElement('chat-editor')
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
      <div class="title">Agent settings</div>
      <div>See agent tab to configure mediator agents!</div>
    `;
  }

  private renderTimeLimit() {
    const timeLimit = this.stage?.timeLimitInMinutes ?? null;
    const requireFullTime = this.stage?.requireFullTime ?? false;

    const updateCheck = () => {
      if (!this.stage) return;
      if (this.stage.timeLimitInMinutes) {
        this.experimentEditor.updateStage({
          ...this.stage,
          timeLimitInMinutes: null,
        });
      } else {
        this.experimentEditor.updateStage({
          ...this.stage,
          timeLimitInMinutes: 20, // Default to 20 if checked
        });
      }
    };

    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const timeLimit = Number((e.target as HTMLTextAreaElement).value);
      this.experimentEditor.updateStage({
        ...this.stage,
        timeLimitInMinutes: timeLimit,
      });
    };

    const updateRequireFullTime = (e: Event) => {
      if (!this.stage) return;
      this.experimentEditor.updateStage({
        ...this.stage,
        requireFullTime: (e.target as HTMLInputElement).checked,
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
                  Elapsed time from first message to conversation close (in
                  minutes)
                </label>
                <input
                  type="number"
                  id="timeLimit"
                  name="timeLimit"
                  min="0"
                  .value=${timeLimit}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @input=${updateNum}
                />
              </div>
              <div class="checkbox-wrapper tab">
                <md-checkbox
                  touch-target="wrapper"
                  ?checked=${requireFullTime}
                  ?disabled=${!this.experimentEditor.canEditStages}
                  @change=${updateRequireFullTime}
                >
                </md-checkbox>
                <div>Require participants to stay until time elapses</div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-editor': ChatEditor;
  }
}
