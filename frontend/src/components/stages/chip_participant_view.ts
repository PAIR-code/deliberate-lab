import '../../pair-components/button';

import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {
  ChipLogEntry,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  StageKind
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
  private readonly participantService = core.getService(
    ParticipantService
  );
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService
  );

  @property() stage: ChipStageConfig | null = null;
  @property() answer: ChipStageParticipantAnswer | null = null;

  @state() isOfferLoading = false;
  @state() isAcceptOfferLoading = false;
  @state() isRejectOfferLoading = false;
  @state() isSetTurnLoading = false;

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

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind === StageKind.CHIP &&
      publicData.currentTurn === null && !publicData.isGameOver
    ) {
      const setTurn = async () => {
        if (!this.stage) return;
        this.isSetTurnLoading = true;
        await this.participantAnswerService.setChipTurn(this.stage.id);
        this.isSetTurnLoading = false;
      };

      return html`
        <div class="panel">
          <pr-button
            variant="tonal"
            ?loading=${this.isSetTurnLoading}
            @click=${setTurn}
          >
            Start chip negotiation
          </pr-button>
        </div>
      `;
    }

    const isCurrentTurn = () => {
      if (publicData?.kind !== StageKind.CHIP) return false;

      return publicData.currentTurn?.participantId
        === this.participantService.profile?.publicId;
    }

    return html`
      <div class="panel">
        <div class="status">
          You have
          ${this.stage.chips.map(
              chip => `${this.answer?.chipMap[chip.id] ?? 0} ${chip.name} chips`
            ).join(', ')}
        </div>
        ${isCurrentTurn() ? this.renderSenderView() : this.renderRecipientView()}
      </div>
    `;
  }

  private renderSenderView() {
    const isOfferPending = () => {
      if (!this.stage) return;
      const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
      if (publicData?.kind !== StageKind.CHIP) return nothing;
      return publicData.currentTurn?.offer;
    };

    const sendOffer = async () => {
      if (!this.stage) return;
      this.isOfferLoading = true;
      await this.participantAnswerService.sendChipOffer(this.stage.id);
      this.isOfferLoading = false;
    };

    return html`
      <pr-button
        ?loading=${this.isOfferLoading}
        ?disabled=${isOfferPending()}
        @click=${sendOffer}
      >
        ${isOfferPending() ? 'Offer pending...' : 'Submit offer'}
      </pr-button>
    `;
  }

  private renderRecipientView() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return nothing;

    const offer = publicData.currentTurn?.offer;
    if (!offer) {
      return html`Waiting for an offer...`;
    }

    const acceptOffer = async () => {
      if (!this.stage) return;
      this.isAcceptOfferLoading = true;
      await this.participantService.sendParticipantChipResponse(this.stage.id, true);
      this.isAcceptOfferLoading = false;
    }

    const rejectOffer = async () => {
      if (!this.stage) return;
      this.isRejectOfferLoading = true;
      await this.participantService.sendParticipantChipResponse(this.stage.id, false);
      this.isRejectOfferLoading = false;
    }

    const isResponsePending = () => {
      if (!this.stage) return;
      const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
      if (publicData?.kind !== StageKind.CHIP) return nothing;
      const participantId = this.participantService.profile?.publicId ?? '';
      return participantId in (publicData.currentTurn?.responseMap ?? {});
    };

    return html`
      <div>
        ${offer.senderId} offered to buy
        ${JSON.stringify(offer.buy)} for ${JSON.stringify(offer.sell)}
      </div>
      <div class="buttons">
        <pr-button
          variant="tonal"
          ?loading=${this.isAcceptOfferLoading}
          ?disabled=${isResponsePending()}
          @click=${acceptOffer}
        >
          Accept offer
        </pr-button>
        <pr-button
          color="secondary"
          variant="tonal"
          ?loading=${this.isRejectOfferLoading}
          ?disabled=${isResponsePending()}
          @click=${rejectOffer}
        >
          Reject offer
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
