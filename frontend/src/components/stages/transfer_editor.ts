import '../../pair-components/textarea';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import '@material/web/checkbox/checkbox.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {TransferStageConfig, StageKind} from '@deliberation-lab/utils';

import {styles} from './transfer_editor.scss';

/** Editor for transfer stage. */
@customElement('transfer-editor')
export class TransferEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: TransferStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html` ${this.renderTimeout()} `;
  }

  private renderTimeout() {
    if (!this.stage) return;
    const isTimeout = this.stage.enableTimeout;

    const updateTimeout = () => {
      if (!this.stage) return;
      const enableTimeout = !isTimeout;
      this.experimentEditor.updateStage({...this.stage, enableTimeout});
    };

    return html`
      <div class="section">
        <div class="title">Timeout</div>
        <div class="description">
          Note: If timeout is enabled and the experimenter does not transfer the
          participant within the timeout window, the participant is removed from
          the experiment with TIMEOUT_FAILED status
        </div>
        <div class="checkbox-wrapper">
          <md-checkbox
            touch-target="wrapper"
            ?checked=${isTimeout}
            ?disabled=${!this.experimentEditor.canEditStages}
            @click=${updateTimeout}
          >
          </md-checkbox>
          <div>Enable timeout window</div>
        </div>
        ${isTimeout ? this.renderTimeoutSeconds() : nothing}
      </div>
    `;
  }

  private renderTimeoutSeconds() {
    if (!this.stage) return nothing;
    const waitSeconds = this.stage.timeoutSeconds;
    const updateNum = (e: InputEvent) => {
      if (!this.stage) return;
      const timeoutSeconds = Number((e.target as HTMLTextAreaElement).value);
      this.experimentEditor.updateStage({...this.stage, timeoutSeconds});
    };

    return html`
      <div class="number-input">
        <label for="waitSeconds">
          Timeout window (in seconds) before transfer stage ends
        </label>
        <input
          type="number"
          id="waitSeconds"
          name="waitSeconds"
          min="0"
          .value=${waitSeconds}
          ?disabled=${!this.experimentEditor.canEditStages}
          @input=${updateNum}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transfer-editor': TransferEditorComponent;
  }
}
