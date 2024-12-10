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
  ChipItem,
  ChipLogEntry,
  ChipLogType,
  ChipOffer,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  StageKind,
  createChipOffer,
  displayChipOfferText,
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

  resetChipValues() {
    this.selectedBuyChip = 'RED';
    this.selectedSellChip = 'GREEN';
    this.buyChipAmount = 1;
    this.sellChipAmount = 1;
  }

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
        <chip-reveal-view .stage=${this.stage} .publicData=${publicData}>
        </chip-reveal-view>
        ${isCurrentTurn()
          ? this.renderSenderView()
          : this.renderRecipientView()}
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
      const availableSell = participantChipMap[this.selectedSellChip] ?? 0;

      return (
        this.selectedBuyChip !== this.selectedSellChip && // Ensure different chips are selected
        Number.isInteger(this.buyChipAmount) &&
        Number.isInteger(this.sellChipAmount) &&
        this.buyChipAmount > 0 &&
        this.sellChipAmount > 0 &&
        this.sellChipAmount <= availableSell
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
      this.resetChipValues();
    };

    const isOfferValid = validateOffer();
    return html`
      <div class="offer-panel">
        ${isOfferPending()
          ? ''
          : html`<div class="offer-sending-panel">
              <div class="offer-description">
                It's your turn to send an offer to the other participants.
              </div>
              <div class="offer-config">
                <label>
                  Buy:
                  <select
                    .value=${this.selectedBuyChip}
                    @change=${(e: Event) => {
                      this.selectedBuyChip = (
                        e.target as HTMLSelectElement
                      ).value;
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
                        Math.floor(
                          parseInt((e.target as HTMLInputElement).value, 10)
                        )
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
                      this.selectedSellChip = (
                        e.target as HTMLSelectElement
                      ).value;
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
                        Math.floor(
                          parseInt((e.target as HTMLInputElement).value, 10)
                        )
                      );
                      this.requestUpdate(); // Trigger re-render after input
                    }}
                  />
                </label>
              </div>

              ${!isOfferValid
                ? html`<div class="warning">
                    ‼️ You cannot offer to buy and sell the same chip color, and
                    you must have the amount that you are offering to sell.
                  </div>`
                : nothing}
            </div>`}
        <pr-button
          ?loading=${this.isOfferLoading}
          ?disabled=${!isOfferValid || isOfferPending()}
          @click=${sendOffer}
        >
          ${isOfferPending() ? 'Offer sent and pending...' : 'Submit offer'}
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
    const senderName = `${senderParticipant!.avatar} ${getParticipantName(
      senderParticipant!
    )}`;
    return html`
      <div class="offer-panel">
        <div class="offer-description">
          Incoming offer!<br />
          ${senderName} would like to buy ${displayChipOfferText(offer.buy)} for
          ${displayChipOfferText(offer.sell)}.
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
    const renderEntry = (message: string) => {
      return html`
        <div class="log-entry">
          <div class="subtitle">
            ${convertUnifiedTimestampToDate(entry.timestamp)}
          </div>
          <div>${message}</div>
        </div>
      `;
    }

    switch (entry.type) {
      case ChipLogType.ERROR:
        return renderEntry(entry.errorMessage);
      case ChipLogType.INFO:
        return renderEntry(entry.infoMessage);
      case ChipLogType.NEW_ROUND:
        return renderEntry(`Round ${entry.roundNumber + 1}`);
      case ChipLogType.NEW_TURN:
        // TODO: Render participant name and avatar
        return renderEntry(`${entry.participantId}'s turn`);
      case ChipLogType.OFFER:
        // TODO: Render participant name and avatar
        return renderEntry(
          `${entry.offer.senderId} offered
           ${displayChipOfferText(entry.offer.sell)}
           for ${displayChipOfferText(entry.offer.buy)}
          `
        );
      case ChipLogType.OFFER_DECLINED:
        // TODO: Render participant name and avatar
        return renderEntry(
          `Transaction failed: No one accepted ${entry.offer.senderId}'s offer`
        );
      case ChipLogType.TRANSACTION:
        // TODO: Render participant name and avatar
        const sender = entry.offer.senderId;
        const recipient = entry.recipientId;
        return renderEntry(
          `Transaction cleared: ${sender}'s offer was accepted by ${recipient}`
        );
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chip-participant-view': ChipView;
  }
}
