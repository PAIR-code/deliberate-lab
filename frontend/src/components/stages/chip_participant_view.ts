import '../../pair-components/button';

import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  ChipLogEntry,
  ChipStageConfig,
  ChipStageParticipantAnswer,
} from '@deliberation-lab/utils';
import {
  convertUnifiedTimestampToDate
} from '../../shared/utils';

import {styles} from './chip_view.scss';

/** Chip stage view for participants. */
@customElement('chip-participant-view')
export class ChipView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService
  );

  @property() stage: ChipStageConfig | null = null;
  @property() answer: ChipStageParticipantAnswer | null = null;

  override render() {
    if (!this.stage) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="panel-wrapper">
        ${this.renderStatusPanel()} ${this.renderLogsPanel()}
      </div>
      <stage-footer>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderStatusPanel() {
    if (!this.stage) return nothing;

    const isOfferPending = () => {
      return this.answer?.pendingOffer;
    };

    const sendOffer = async () => {
      if (!this.stage) return;
      await this.participantAnswerService.sendChipOffer(this.stage.id);
    };

    return html`
      <div class="panel">
        <div class="status">
          You have
          ${this.stage.chips.map(
              chip => `${this.answer?.chipMap[chip.id] ?? 0} ${chip.name} chips`
            ).join(', ')}
        </div>
        <pr-button
          ?disabled=${isOfferPending()}
          @click=${sendOffer}
        >
          ${isOfferPending() ? 'Offer pending...' : 'Submit offer'}
        </pr-button>
      </div>
    `;
  }

  private renderLogsPanel() {
    if (!this.stage) return nothing;

    const logs = this.cohortService.getChipLogEntries(this.stage.id);

    if (logs.length === 0) {
      return html`
        <div class="panel log">No logs yet</div>
      `;
    }
    return html`
      <div class="panel log">
        ${logs.map(entry => this.renderLogEntry(entry))}
      </div>
    `;
  }

  private renderLogEntry(entry: ChipLogEntry) {
    return html`
      <div class="log-entry">
        <div class="subtitle">
          ${convertUnifiedTimestampToDate(entry.timestamp)}
        </div>
        <div class="subtitle">
          ${entry.offerStatus}
        </div>
        <div>
          ${entry.participantId} offered to buy
          ${JSON.stringify(entry.offer.buy)} for ${JSON.stringify(entry.offer.sell)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chip-participant-view': ChipView;
  }
}
