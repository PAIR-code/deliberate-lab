import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ExperimentEditor} from '../../services/experiment.editor';

import {NegotiationPayoutStageConfig} from '@deliberation-lab/utils';

import {styles} from './info_editor.scss';

/** Editor for negotiation payout summary stage. */
@customElement('negotiation-payout-editor')
export class NegotiationPayoutEditorComponent extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly experimentEditor = core.getService(ExperimentEditor);

  @property() stage: NegotiationPayoutStageConfig | undefined = undefined;

  override render() {
    if (this.stage === undefined) {
      return nothing;
    }

    return html`
      <div class="description-card">
        <div class="subtitle">
          This stage automatically validates coalition agreements and calculates
          final payouts for Party A, Party B, and Party C based on their
          assigned negotiation profiles and final decision survey answers.
        </div>
        <br />
        <div class="subtitle">
          Use the <b>Metadata</b> tab to configure the stage name and
          instructions, and the <b>Progress settings</b> tab to manage
          participant progression requirements.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'negotiation-payout-editor': NegotiationPayoutEditorComponent;
  }
}
