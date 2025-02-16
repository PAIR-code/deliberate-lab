import '../../pair-components/button';
import '../../pair-components/tooltip';
import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';
import {SalespersonStageConfig, StageKind} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

import {styles} from './salesperson_view.scss';

/** Salesperson stage view for participants. */
@customElement('salesperson-participant-view')
export class SalespersonView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: SalespersonStageConfig | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (!publicData || publicData.kind !== StageKind.SALESPERSON) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="panel-wrapper">
        <div>Coming soon</div>
      </div>
      <stage-footer .disabled=${!publicData.isGameOver}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'salesperson-participant-view': SalespersonView;
  }
}
