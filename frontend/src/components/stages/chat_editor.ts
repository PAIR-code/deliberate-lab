import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';

import {ExperimentEditor} from '../../services/experiment.editor';

import {
  ChatStageConfig,
  StageKind,
  checkApiKeyExists,
} from '@deliberation-lab/utils';

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

    // Check if experimenter's API key exists
    let apiCheck;
    if (!checkApiKeyExists(this.authService.experimenterData)) {
      apiCheck = html`
        <div class="warning">
          <b>Note:</b> In order for LLM calls to work, you must add an API key
          or server configuration under Experimenter Settings.
        </div>
      `;
    } else {
      apiCheck = html`
        <div class="notification">
          <b>✅ A valid API key has been added. If it is valid, LLM calls will work.
        </div>
      `;
    }

    return html`
      <div class="title">Conversation settings</div>
      ${this.renderTimeLimit()}
      <div class="divider"></div>
      <div class="title">Agent settings</div>
      <div>See agent tab to configure mediator agents!</div>
      ${apiCheck}
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
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-editor': ChatEditor;
  }
}
