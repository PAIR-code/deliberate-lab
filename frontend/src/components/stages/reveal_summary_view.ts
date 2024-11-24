import './ranking_reveal_view';
import './survey_reveal_view';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  RevealItem,
  RevealStageConfig,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './reveal_view.scss';

/** Reveal stage summary view. */
@customElement('reveal-summary-view')
export class RevealView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly experimentService = core.getService(ExperimentService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: RevealStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <div class="reveal-wrapper">
        ${this.stage.items.map((item) => this.renderItem(item))}
      </div>
    `;
  }

  private renderItem(item: RevealItem) {
    const stage = this.experimentService.getStage(item.id);
    const answer = this.participantService.answerMap[item.id];
    const publicData = this.cohortService.stagePublicDataMap[item.id];
    if (!stage) return nothing;

    switch (item.kind) {
      case StageKind.RANKING:
        return html`
          <ranking-reveal-view .item=${item} .publicData=${publicData}>
          </ranking-reveal-view>
        `;
      case StageKind.SURVEY:
        return html`
          <survey-reveal-view .item=${item} .stage=${stage} .answer=${answer}>
          </survey-reveal-view>
        `;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reveal-summary-view': RevealView;
  }
}
