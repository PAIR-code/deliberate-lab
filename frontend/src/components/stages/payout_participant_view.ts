import '../progress/progress_stage_completed';
import './payout_summary_view';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {
  PayoutStageConfig,
  PayoutStageParticipantAnswer,
} from '@deliberation-lab/utils';

import {styles} from './payout_view.scss';

/** Payout stage view for participants. */
@customElement('payout-participant-view')
export class PayoutView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: PayoutStageConfig | null = null;
  @property() answer: PayoutStageParticipantAnswer | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <payout-summary-view .stage=${this.stage} .answer=${this.answer}>
      </payout-summary-view>
      <stage-footer>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'payout-participant-view': PayoutView;
  }
}
