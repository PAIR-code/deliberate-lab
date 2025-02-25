import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {ParticipantProfile} from '@deliberation-lab/utils';
import {getParticipantProgress} from '../../shared/participant.utils';

import {styles} from './progress_bar.scss';

/** Progress bar for participant's stage completion. */
@customElement('participant-progress-bar')
export class Progress extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  @property() participant: ParticipantProfile | undefined = undefined;
  @property() stageIds: string[] = []; // stages in participant's experiment

  override render() {
    if (!this.participant) return nothing;

    const progress = getParticipantProgress(this.participant, this.stageIds);
    const total = this.stageIds.length;
    const ratio = progress / total;

    return html`
      <pr-tooltip
        text="${progress} of ${total} stages completed"
        position="LEFT"
      >
        <div class="progress-bar">
          <div
            class="progress completed"
            style=${`width: calc(100% * ${ratio})`}
          ></div>
        </div>
      </pr-tooltip>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-progress-bar': Progress;
  }
}
