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
  ParticipantProfile,
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
      return html`<div class="divider"></div>
        <div class="panel">
          <div class="status">
            This game has ended. Please continue to the next stage.
          </div>
          <chip-reveal-view .stage=${this.stage} .publicData=${publicData}>
          </chip-reveal-view>
        </div> `;
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
        <div class="offer-sending-panel">
          <div class="offer-description">
            It's your turn to send an offer to the other participants.
          </div>
          <div class="offer-config">
            <label>
              Buy:
              <select
                .disabled=${isOfferPending()}
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
                .disabled=${isOfferPending()}
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
                .disabled=${isOfferPending()}
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
                .disabled=${isOfferPending()}
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
                ‼️ You cannot offer to buy and sell the same chip color, and you
                must have the amount that you are offering to sell.
              </div>`
            : nothing}
        </div>
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
          ${senderName} is offering ${displayChipOfferText(offer.sell)} to get
          ${displayChipOfferText(offer.buy)} in return.
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

    const logTypePriority = {
      [ChipLogType.OFFER_DECLINED]: 0,
      [ChipLogType.TRANSACTION]: 0,
      [ChipLogType.OFFER]: 1,
      [ChipLogType.NEW_TURN]: 2,
      [ChipLogType.NEW_ROUND]: 3,
      [ChipLogType.INFO]: 4,
      [ChipLogType.ERROR]: 4,
    };

    const logs = this.cohortService.getChipLogEntries(this.stage.id);

    if (logs.length === 0) {
      return html` <div class="panel log">No logs yet</div> `;
    }
    return html`
      <div class="panel log">
        ${logs
          .slice()
          .sort((a, b) => {
            const timeA =
              a.timestamp.seconds * 1000 + a.timestamp.nanoseconds / 1e6;
            const timeB =
              b.timestamp.seconds * 1000 + b.timestamp.nanoseconds / 1e6;

            // Compare by timestamp first
            if (timeA !== timeB) {
              return timeA - timeB;
            }

            return (
              (logTypePriority[b.type] || Infinity) -
              (logTypePriority[a.type] || Infinity)
            );
          })
          .map((entry) => this.renderLogEntry(entry))}
      </div>
    `;
  }

  private getParticipant(participantId: string) {
    return this.cohortService
      .getAllParticipants()
      .find((p) => p.publicId === participantId)!;
  }

  private getParticipantDisplay(participant: ParticipantProfile) {
    if (participant.avatar && participant.name) {
      return `${participant.avatar} ${participant.name}`;
    }

    return participant.name ?? participant.publicId;
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
    };

    let participant;
    switch (entry.type) {
      case ChipLogType.ERROR:
        return renderEntry(entry.errorMessage);
      case ChipLogType.INFO:
        return renderEntry(entry.infoMessage);
      case ChipLogType.NEW_ROUND:
        return html`
          <div class="divider"></div>
          <div class="round-text">
            Round ${entry.roundNumber + 1} of ${this.stage!.numRounds}
          </div>
        `;
      case ChipLogType.NEW_TURN:
        participant = this.getParticipant(entry.participantId);
        return renderEntry(
          `${this.getParticipantDisplay(
            participant
          )}'s turn to submit an offer!`
        );
      case ChipLogType.OFFER:
        participant = this.getParticipant(entry.offer.senderId);

        return renderEntry(
          `${this.getParticipantDisplay(participant)} is offering 
           ${displayChipOfferText(
             entry.offer.sell
           )} of their chips to get ${displayChipOfferText(
            entry.offer.buy
          )} in return.`
        );
      case ChipLogType.OFFER_DECLINED:
        participant = this.getParticipant(entry.offer.senderId);
        return renderEntry(
          `❌ No deal: No one accepted ${this.getParticipantDisplay(
            participant
          )}'s offer.`
        );
      case ChipLogType.TRANSACTION:
        const sender = this.getParticipant(entry.offer.senderId);
        const recipient = this.getParticipant(entry.recipientId);

        return renderEntry(
          `🤝 Deal made: ${this.getParticipantDisplay(
            sender
          )}'s offer was accepted by ${this.getParticipantDisplay(recipient)}.`
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
