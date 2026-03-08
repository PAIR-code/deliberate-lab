import {MobxLitElement} from '@adobe/lit-mobx';
import {html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {RankingStageConfig} from '@deliberation-lab/utils';

@customElement('lr-info-ranking-view')
export class LRInfoRankingView extends MobxLitElement {
  @property() stage!: RankingStageConfig;

  private readonly participantService = core.getService(ParticipantService);

  override render() {
    if (!this.stage) return nothing;

    return html`
      <div class="lr-info-wrapper">
        <h3>${this.stage.name}</h3>
        <p>This is an information-only page. No ranking is required.</p>

        <button @click=${this.next}>Next</button>
      </div>
    `;
  }

  private async next() {
    // Submit empty ranking list → triggers LR logic
    const ps = this.participantService;
    await ps.updateRankingStageParticipantAnswer(
      this.stage.id,
      [], // very important!
    );

    await ps.progressToNextStage();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lr-info-ranking-view': LRInfoRankingView;
  }
}
