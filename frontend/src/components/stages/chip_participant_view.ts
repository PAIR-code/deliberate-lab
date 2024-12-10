import '../../pair-components/button';

import '../progress/progress_stage_completed';

import './chip_reveal_view';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {getParticipantName} from '../../shared/participant.utils';
import {
  createChipOffer,
  ChipItem,
  ChipLogEntry,
  ChipOffer,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  StageKind,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

import {styles} from './chip_view.scss';

/** Chip stage view for participants. */
@customElement('chip-participant-view')
export class ChipView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService
  );

  private selectedBuyChip: string = 'RED';
  private selectedSellChip: string = 'GREEN';
  private buyChipAmount: number = 1;
  private sellChipAmount: number = 1;

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

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (!publicData || publicData.kind !== StageKind.CHIP) {
      return nothing;
    }

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="panel-wrapper">
        ${this.renderStatusPanel()} ${this.renderLogsPanel()}
      </div>
      <stage-footer .disabled=${!publicData.isGameOver}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderStatusPanel() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (!publicData || publicData.kind !== StageKind.CHIP) {
      return nothing;
    }

    if (publicData.isGameOver) {
      return html` <div class="panel">Game over</div> `;
    } else if (publicData.currentTurn === null) {
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

      return (
        publicData.currentTurn?.participantId ===
        this.participantService.profile?.publicId
      );
    };

    return html`
      <div class="panel">
        ${this.renderChipStatus()}
        <chip-reveal-view .stage=${this.stage} .publicData=${publicData}>
        </chip-reveal-view>
        ${isCurrentTurn()
          ? this.renderSenderView()
          : this.renderRecipientView()}
      </div>
    `;
  }

  private renderChipStatus() {
    if (!this.stage) return nothing;

    const renderChip = (chip: ChipItem) => {
      return html`
        <li>
          ${this.answer?.chipMap[chip.id] ?? 0} ${chip.name} chips (x
          ${this.answer?.chipValueMap[chip.id] ?? 0.0} per chip)
        </li>
      `;
    };

    const getTotal = () => {
      if (!this.stage) return 0;
      let total = 0;
      this.stage.chips.forEach((chip) => {
        const quantity = this.answer?.chipMap[chip.id] ?? 0;
        const value = this.answer?.chipValueMap[chip.id] ?? 0;
        total += quantity * value;
      });
      return total;
    };

    return html`
      <div class="status">
        <div>You have:</div>
        <ul>
          ${this.stage.chips.map((chip) => renderChip(chip))}
        </ul>
        <div>Total: $${getTotal()}</div>
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

    const validateOffer = () => {
      const publicData = this.cohortService.stagePublicDataMap[this.stage!.id];
      if (publicData?.kind !== StageKind.CHIP) return nothing;
      const participantChipMap =
        publicData.participantChipMap[
          this.participantService.profile!.publicId
        ] ?? {};
      const availableBuy = participantChipMap[this.selectedBuyChip] ?? 0;
      const availableSell = participantChipMap[this.selectedSellChip] ?? 0;

      return (
        this.selectedBuyChip !== this.selectedSellChip && // Ensure different chips are selected
        Number.isInteger(this.buyChipAmount) &&
        Number.isInteger(this.sellChipAmount) &&
        this.buyChipAmount > 0 &&
        this.sellChipAmount > 0 &&
        this.sellChipAmount <= availableSell &&
        this.buyChipAmount <= availableBuy
      );
    };

    const sendOffer = async () => {
      if (!this.stage) return;
      this.isOfferLoading = true;
      const chipOffer: Partial<ChipOffer> = {
        senderId: this.participantService.profile?.publicId,
        buy: {[this.selectedBuyChip]: this.buyChipAmount},
        sell: {[this.selectedSellChip]: this.sellChipAmount},
      };
      await this.participantService.sendParticipantChipOffer(
        this.stage.id,
        createChipOffer(chipOffer)
      );

      this.isOfferLoading = false;
    };

    const isOfferValid = validateOffer();
    return html`
      <div class="offer-panel">
        <div class="offer-description">
          It's your turn to send an offer to the other participants.
        </div>
        <div class="offer-config">
          <label>
            Buy:
            <select
              .value=${this.selectedBuyChip}
              @change=${(e: Event) => {
                this.selectedBuyChip = (e.target as HTMLSelectElement).value;
                this.requestUpdate(); // Trigger re-render after change
              }}
            >
              <option value="RED">🔴 Red</option>
              <option value="GREEN">🟢 Green</option>
              <option value="BLUE">🔵 Blue</option>
            </select>
            <input
              type="number"
              min="1"
              .value=${this.buyChipAmount}
              @input=${(e: Event) => {
                this.buyChipAmount = Math.max(
                  1,
                  Math.floor(parseInt((e.target as HTMLInputElement).value, 10))
                );
                this.requestUpdate(); // Trigger re-render after input
              }}
            />
          </label>
          <label>
            Sell:
            <select
              .value=${this.selectedSellChip}
              @change=${(e: Event) => {
                this.selectedSellChip = (e.target as HTMLSelectElement).value;
                this.requestUpdate(); // Trigger re-render after change
              }}
            >
              <option value="RED">🔴 Red</option>
              <option value="GREEN">🟢 Green</option>
              <option value="BLUE">🔵 Blue</option>
            </select>
            <input
              type="number"
              min="1"
              .value=${this.sellChipAmount}
              @input=${(e: Event) => {
                this.sellChipAmount = Math.max(
                  1,
                  Math.floor(parseInt((e.target as HTMLInputElement).value, 10))
                );
                this.requestUpdate(); // Trigger re-render after input
              }}
            />
          </label>
        </div>

        ${!isOfferValid
          ? html`<div class="warning">
              ‼️ You cannot offer to buy and sell the same chip color, and you
              must have the amount that you are offering to sell.
            </div>`
          : nothing}

        <pr-button
          ?loading=${this.isOfferLoading}
          ?disabled=${!isOfferValid || isOfferPending()}
          @click=${sendOffer}
        >
          ${isOfferPending() ? 'Offer pending...' : 'Submit offer'}
        </pr-button>
      </div>
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
      await this.participantService.sendParticipantChipResponse(
        this.stage.id,
        true
      );
      this.isAcceptOfferLoading = false;
    };

    const rejectOffer = async () => {
      if (!this.stage) return;
      this.isRejectOfferLoading = true;
      await this.participantService.sendParticipantChipResponse(
        this.stage.id,
        false
      );
      this.isRejectOfferLoading = false;
    };

    const isResponsePending = () => {
      if (!this.stage) return;
      const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
      if (publicData?.kind !== StageKind.CHIP) return nothing;
      const participantId = this.participantService.profile?.publicId ?? '';
      return participantId in (publicData.currentTurn?.responseMap ?? {});
    };

    const senderParticipant = this.cohortService
      .getAllParticipants()
      .find((p) => p.publicId === offer.senderId);
    const senderName = getParticipantName(senderParticipant!);
    return html`
      <div class="offer-panel">
        <div class="offer-description">
          ${senderName} offered to buy ${JSON.stringify(offer.buy)} for
          ${JSON.stringify(offer.sell)}
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
      </div>
    `;
  }

  private renderLogsPanel() {
    if (!this.stage) return nothing;

    const logs = this.cohortService.getChipLogEntries(this.stage.id);

    if (logs.length === 0) {
      return html` <div class="panel log">No logs yet</div> `;
    }
    return html`
      <div class="panel log">
        ${logs.map((entry) => this.renderLogEntry(entry))}
      </div>
    `;
  }

  private renderLogEntry(entry: ChipLogEntry) {
    return html`
      <div class="log-entry">
        <div class="subtitle">
          ${convertUnifiedTimestampToDate(entry.timestamp)}
        </div>
        <div>${entry.message}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chip-participant-view': ChipView;
  }
}
