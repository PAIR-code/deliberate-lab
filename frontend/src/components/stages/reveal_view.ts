import '../progress/progress_stage_completed';

import './stage_description';
import './stage_footer';
import './election_reveal_view';
import './survey_reveal_view';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ExperimentService} from '../../services/experiment.service';
import {ParticipantService} from '../../services/participant.service';

import {
  RevealStageConfig,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './reveal_view.scss';

/** Reveal stage view for participants. */
@customElement('reveal-view')
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
      <stage-description .stage=${this.stage}></stage-description>
      <div class="reveal-wrapper">
        ${this.stage.stageIds.map(id => this.renderStage(id))}
      </div>
      <stage-footer>
        ${this.stage.progress.showParticipantProgress ?
          html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderStage(stageId: string) {
    const stage = this.experimentService.getStage(stageId);
    const answer = this.participantService.answerMap[stageId];
    const publicData = this.cohortService.stagePublicDataMap[stageId];
    if (!stage) return nothing;

    switch(stage.kind) {
      case StageKind.ELECTION:
        return html`
          <election-reveal-view .publicData=${publicData}>
          </election-reveal-view>
        `;
      case StageKind.SURVEY:
        return html`
          <survey-reveal-view .stage=${stage} .answer=${answer}>
          </survey-reveal-view>
        `;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reveal-view': RevealView;
  }
}