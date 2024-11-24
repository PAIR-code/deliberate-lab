import '../progress/progress_stage_completed';

import './stage_description';
import './stage_footer';
import './reveal_summary_view';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {RevealStageConfig} from '@deliberation-lab/utils';

import {styles} from './reveal_view.scss';

/** Reveal stage view for participants. */
@customElement('reveal-participant-view')
export class RevealView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() stage: RevealStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <reveal-summary-view .stage=${this.stage}></reveal-summary-view>
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
    'reveal-participant-view': RevealView;
  }
}
