import '../../pair-components/button';

import '../progress/progress_stage_completed';

import './chip_reveal_view';
import './stage_description';
import './stage_footer';
import '../../pair-components/tooltip';

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
  ChipStagePublicData,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  ChipTransaction,
  ChipTransactionStatus,
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

  @property() stage: ChipStageConfig | null = null;
  @property() answer: ChipStageParticipantAnswer | null = null;

  @state() isOfferLoading = false;
  @state() isAcceptOfferLoading = false;
  @state() isRejectOfferLoading = false;
  @state() isSetTurnLoading = false;

  // Offer interface variables
  @state() selectedBuyChip: string = '';
  @state() selectedSellChip: string = '';
  @state() buyChipAmount: number = 0;
  @state() sellChipAmount: number = 0;

  resetChipValues() {
    this.selectedBuyChip = '';
    this.selectedSellChip = '';
    this.buyChipAmount = 0;
    this.sellChipAmount = 0;
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
      return html`
        <div class="panel">
          <div class="status">
            This game has ended. Please continue to the next stage.
          </div>
          <chip-reveal-view .stage=${this.stage} .publicData=${publicData}>
          </chip-reveal-view>
        </div>
      `;
    } else if (this.participantService.completedStage(this.stage.id)) {
      // If game was never started because participants transferred
      // from different stage
      // TODO: Show results from the cohort game that participant
      // was in
      return html`
        <div class="panel">
          <div class="status">
            This game has ended. Please continue to the next stage.
          </div>
        </div>
      `;
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
        publicData.currentTurn ===
        this.participantService.profile?.publicId
      );
    };

    return html`
      <div class="panel panel-left">
        ${isCurrentTurn()
          ? this.renderSenderView()
          : this.renderRecipientView()}
        <div class="divider"></div>
        <chip-reveal-view .stage=${this.stage} .publicData=${publicData}>
        </chip-reveal-view>
      </div>
    `;
  }

  private getTransaction(round: number, turn: string) {
    if (!this.stage) return null;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return null;
    const offerMap = publicData.participantOfferMap;

    if (!offerMap[round] || !offerMap[round][turn]) {
      return null;
    }
    return offerMap[round][turn];
  }

  private getCurrentTransaction() {
    if (!this.stage) return null;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return null;

    const currentRound = publicData.currentRound;
    const currentTurn = publicData.currentTurn ?? '';
    const offerMap = publicData.participantOfferMap;

    if (!offerMap[currentRound] || !offerMap[currentRound][currentTurn]) {
      return null;
    }
    return offerMap[currentRound][currentTurn];
  }

  private isOfferPending() {
    return this.getCurrentTransaction()?.offer ?? false;
  }

  private isOfferAcceptable() {
    const publicData = this.cohortService.stagePublicDataMap[this.stage!.id];
    if (publicData?.kind !== StageKind.CHIP) return true;

    const currentParticipant = this.participantService.profile;
    for (const participant of this.cohortService.getAllParticipants()) {
      if (participant.publicId === currentParticipant!.publicId) continue;
      const participantChipMap =
        publicData.participantChipMap[participant.publicId] ?? {};
      if (participantChipMap[this.selectedBuyChip] >= this.buyChipAmount) {
        return true;
      }
    }
    return false;
  }

  private isOfferIncomplete() {
    return (
      this.selectedBuyChip === '' ||
      this.selectedSellChip === '' ||
      this.buyChipAmount === 0 ||
      this.sellChipAmount === 0
    );
  }

  private isOfferEmpty() {
    return this.buyChipAmount === 0 && this.sellChipAmount === 0;
  }

  private getAvailableSell() {
    /* Returns how many chips of the current selected chip we can sell. */
    const publicData = this.cohortService.stagePublicDataMap[this.stage!.id];
    if (publicData?.kind !== StageKind.CHIP) return 0;

    const publicId = this.participantService.profile?.publicId ?? '';
    const participantChipMap = publicData.participantChipMap[publicId] ?? {};
    const availableSell = participantChipMap[this.selectedSellChip] ?? 0;

    return availableSell;
  }
  private isOfferValid() {
    return (
      // Ensure different chips are selected
      this.selectedBuyChip !== this.selectedSellChip &&
      this.selectedBuyChip !== '' &&
      this.selectedSellChip !== '' &&
      Number.isInteger(this.buyChipAmount) &&
      Number.isInteger(this.sellChipAmount) &&
      this.buyChipAmount > 0 &&
      this.sellChipAmount > 0 &&
      this.sellChipAmount <= this.getAvailableSell()
    );
  }

  private renderSenderView() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (!publicData || publicData.kind !== StageKind.CHIP) {
      return nothing;
    }

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

    const renderOfferPayout = () => {
      let payoutHtml = html``;
      if (!this.isOfferIncomplete() && this.isOfferValid()) {
        if (!this.stage || !this.participantService.profile) return 0;
        const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
        if (publicData?.kind !== StageKind.CHIP) return 0;

        const currentParticipant = this.participantService.profile;
        const participantChipMap =
          publicData.participantChipMap[currentParticipant.publicId] ?? {};
        const participantChipValueMap =
          publicData.participantChipValueMap[currentParticipant.publicId] ?? {};

        const payouts = this.calculatePayout(
          participantChipMap,
          participantChipValueMap,
          {[this.selectedBuyChip]: this.buyChipAmount}, // gained chips
          {[this.selectedSellChip]: this.sellChipAmount} // lost chips
        );

        const currentTotalPayout = payouts.before;
        const newTotalPayout = payouts.after;
        const diff = newTotalPayout - currentTotalPayout;
        const diffDisplay = html`<span
          class=${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}
          ><b>(${diff > 0 ? '+' : ''}${diff.toFixed(2)})</b></span
        >`;
        payoutHtml = html`<p>
          If this offer is accepted, your updated payout will be
          <b>$${newTotalPayout.toFixed(2)}</b> ${diffDisplay}.
        </p>`;
      }
      return html`<div class="payout-panel">${payoutHtml}</div>`;
    };

    const renderValidationMessages = () => {
      if (this.isOfferIncomplete()) {
        return html`<div class="warnings-panel"></div>`;
      }

      const errors = [];

      // Check if the offer is unacceptable
      if (!this.isOfferAcceptable()) {
        errors.push(html`
          <div class="warning">
            ⚠️ No other players have enough chips to accept your offer.
          </div>
        `);
      }

      // Validate the offer
      if (!this.isOfferValid()) {
        if (this.getAvailableSell() < this.sellChipAmount) {
          errors.push(html`
            <div class="warning">
              ‼️ You cannot give more chips than you have.
            </div>
          `);
        }

        if (this.selectedBuyChip === this.selectedSellChip) {
          errors.push(html`
            <div class="warning">
              ‼️ You cannot offer to buy and sell the same chip type.
            </div>
          `);
        }
      }

      // Return all collected errors
      return html`<div class="warnings-panel">${errors}</div>`;
    };

    return html`
      <div class="offer-panel">
        <div class="offer-description">
          ${this.isOfferPending() ? `Waiting on other participants to evaluate your offer...` : `✋ It's your turn! Make an offer to the other participants.`}
        </div>

        <div class="offer-form">
          <div class="offer-config">
            <label class="offer-config-label">You give:</label>
            ${this.renderChipNumberInput(this.sellChipAmount, (value) => {
              this.sellChipAmount = value;
            })}
            ${this.renderChipSelector(this.selectedSellChip, (value) => {
              this.selectedSellChip = value;
            })}
          </div>
          <div class="offer-config">
            <label class="offer-config-label">You get:</label>
            ${this.renderChipNumberInput(this.buyChipAmount, (value) => {
              this.buyChipAmount = value;
            })}
            ${this.renderChipSelector(this.selectedBuyChip, (value) => {
              this.selectedBuyChip = value;
            })}
          </div>
        </div>

        ${renderOfferPayout()} ${renderValidationMessages()}
        <div class="buttons">
          <pr-button
            ?loading=${this.isOfferLoading}
            ?disabled=${this.isOfferEmpty() ||
            !this.isOfferValid() ||
            this.isOfferPending()}
            @click=${sendOffer}
          >
            ${this.isOfferPending()
              ? 'Offer sent and pending...'
              : 'Submit offer'}
          </pr-button>
        </div>
      </div>
    `;
  }

  private renderChipNumberInput(
    value: number,
    onInput: (value: number) => void
  ) {
    const updateInput = (e: Event) => {
      const value = Math.floor(
        parseInt((e.target as HTMLInputElement).value, 10)
      );

      onInput(Math.max(1, value));
    };

    return html`
      <div class="number-input">
        <input
          .disabled=${this.isOfferPending()}
          type="number"
          min="0"
          .value=${value}
          @input=${updateInput}
        />
      </div>
    `;
  }

  // TODO: Move to utils? We do a similar calculation in cloud functions
  private calculatePayout(
    chipMap: Record<string, number>,
    chipValueMap: Record<string, number>,
    addChipMap: Record<string, number> = {},
    removeChipMap: Record<string, number> = {}
  ) {
    // Calculate the total payout before the offer
    let currentTotalPayout = Object.keys(chipMap)
      .map((chipId) => {
        const quantity = chipMap[chipId] ?? 0;
        const value = chipValueMap[chipId] ?? 0;
        return quantity * value;
      })
      .reduce((total, value) => total + value, 0);

      // Calculate the changes from the offer
    const addAmount = Object.keys(addChipMap).map((chipId) => {
      return (addChipMap[chipId] ?? 0) * (chipValueMap[chipId] ?? 0)
    }).reduce((total, value) => total + value, 0);

    const removeAmount = Object.keys(removeChipMap).map((chipId) => {
      return (removeChipMap[chipId] ?? 0) * (chipValueMap[chipId] ?? 0)
    }).reduce((total, value) => total + value, 0);

    // Update the hypothetical payout
    return {
      before: currentTotalPayout,
      after: currentTotalPayout + addAmount - removeAmount
    };
  }

  private renderChipSelector(value: string, onInput: (value: string) => void) {
    return html`
      <select
        .disabled=${this.isOfferPending()}
        .value=${value}
        @change=${(e: Event) => {
          onInput((e.target as HTMLSelectElement).value);
        }}
      >
        <option value=""></option>
        ${this.stage?.chips.map(
          (chip) => html`<option value=${chip.id}>${chip.avatar} ${chip.name}</option>`
        )}
      </select>
    `;
  }

  private renderRecipientView() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return nothing;

    const offer = this.getCurrentTransaction()?.offer ?? null;
    if (!offer) {
      return html`<div class="offer-panel">Waiting for an offer...</div>`;
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

    const canAcceptOffer = () => {
      if (!this.stage) return;
      const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
      if (publicData?.kind !== StageKind.CHIP) return nothing;

      const buyChip = Object.keys(offer.buy)[0];

      const publicId = this.participantService.profile?.publicId ?? '';
      const participantChipMap = publicData.participantChipMap[publicId] ?? {};
      const availableSell = participantChipMap[buyChip] ?? 0;

      return availableSell >= offer.buy[buyChip];
    };

    const displayHypotheticalTotal = () => {
      if (!this.stage || !this.participantService.profile) return 0;

      const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
      if (publicData?.kind !== StageKind.CHIP) return 0;

      const currentParticipant = this.participantService.profile;
      const currentId = currentParticipant.publicId;
      const participantChipMap =
        publicData.participantChipMap[currentId] ?? {};
      const participantChipValueMap =
        publicData.participantChipValueMap[currentId] ?? {};

      const offer = this.getCurrentTransaction()?.offer ?? null;
      if (!offer) return nothing;

      const payouts = this.calculatePayout(
        participantChipMap,
        participantChipValueMap,
        offer.sell, // the participant will gain what the sender is selling
        offer.buy, // the participant will lose what the sender is buying
      );

      const currentTotalPayout = payouts.before;
      const newTotalPayout = payouts.after;

      const diff = newTotalPayout - currentTotalPayout;
      const diffDisplay = html`<span
        class=${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}
        ><b>(${diff > 0 ? '+' : ''}${diff.toFixed(2)})</b></span
      >`;

      return html`<p>
        If you accept this offer, your updated chip value will be
        <b>$${newTotalPayout.toFixed(2)}</b> ${diffDisplay}.
      </p>`;
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
      const round = publicData.currentRound;
      const turn = publicData.currentTurn ?? '';
      const roundMap = publicData.participantOfferMap[round] ?? {};
      const transaction = roundMap[turn];
      return transaction && participantId in transaction.responseMap;
    };

    const senderParticipant = this.cohortService
      .getAllParticipants()
      .find((p) => p.publicId === offer.senderId);
    const senderName = `${senderParticipant!.avatar} ${getParticipantName(
      senderParticipant!
    )}`;

    return html`
      <div class="offer-panel">
        <div class="offer-description">Incoming offer!</div>
        <div>
          <p>
            ${senderName} is offering to give
            <b>${displayChipOfferText(offer.sell, this.stage.chips)}</b> to get
            <b>${displayChipOfferText(offer.buy, this.stage.chips)}</b> in return.
          </p>
          ${displayHypotheticalTotal()}
        </div>
        <div class="buttons">
          <pr-tooltip
            text=${!canAcceptOffer()
              ? 'You do not have enough chips to accept this offer.'
              : ''}
            position="BOTTOM_START"
          >
            <pr-button
              variant="tonal"
              ?loading=${this.isAcceptOfferLoading}
              ?disabled=${isResponsePending() || !canAcceptOffer()}
              @click=${acceptOffer}
            >
              Accept offer
            </pr-button>
          </pr-tooltip>
          <pr-button
            color="error"
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

    const sortLogsByPriority = (a: ChipLogEntry, b: ChipLogEntry) => {
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
    }

    const logs = this.cohortService.getChipLogEntries(this.stage.id);

    if (logs.length === 0) {
      return nothing;
    }

    return html`
      <div class="log-panel">
        <div class="log-scroll-outer-wrapper">
          <div class="log-scroll-inner-wrapper">
            ${logs.slice().sort(sortLogsByPriority).map((entry, index, array) => {
                const isLastEntry = index === array.length - 1;
                return this.renderLogEntry(entry, index === logs.length - 1);
              })}
          </div>
        </div>
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

  private renderLogEntry(entry: ChipLogEntry, isLatestEntry: boolean = false) {
    if (!this.stage) return nothing;

    const renderEntry = (message: string, cssClasses: string = '') => {
      return html`
        <div class="log-entry ${cssClasses}">
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
          ${entry.roundNumber === 0 ? nothing : html`<div class="divider"></div>`}
          <div class="round-text">
            Round ${entry.roundNumber + 1} of ${this.stage!.numRounds}
          </div>
        `;
      case ChipLogType.NEW_TURN:
        participant = this.getParticipant(entry.participantId);
        const isCurrentUser =
          participant.publicId! === this.participantService.profile!.publicId;

        if (isCurrentUser) {
          return renderEntry(
            `Your turn (${this.getParticipantDisplay(
              participant
            )}) to submit an offer!`,
            isLatestEntry ? 'highlight' : ''
          );
        }
        return renderEntry(
          `${this.getParticipantDisplay(
            participant
          )}'s turn to submit an offer!`
        );
      case ChipLogType.OFFER:
        participant = this.getParticipant(entry.offer.senderId);
        const transaction =
          this.getTransaction(entry.offer.round, entry.offer.senderId);
        return html`
          ${renderEntry(
            `${this.getParticipantDisplay(participant)} is offering
             ${displayChipOfferText(
               entry.offer.sell, this.stage.chips
             )} of their chips to get ${displayChipOfferText(
              entry.offer.buy, this.stage.chips
            )} in return.`
          )}
          ${transaction ? this.renderTransactionStatus(transaction) : nothing}
        `;
      default:
        return nothing;
    }
  }

  private renderTransactionStatus(transaction: ChipTransaction) {
    const renderStatus = (message: string) => {
      return html`<div class="log-entry">${message}</div>`;
    };

    const sender = this.getParticipantDisplay(
      this.getParticipant(transaction.offer.senderId)
    );

    switch (transaction.status) {
      case ChipTransactionStatus.PENDING:
        return renderStatus('Waiting for other participants to respond...');
      case ChipTransactionStatus.ACCEPTED:
        const recipient = this.getParticipantDisplay(
          this.getParticipant(transaction.recipientId ?? '')
        );
        return renderStatus(
          `🤝 Deal made: ${sender}'s offer was accepted by ${recipient}.`
        );
      case ChipTransactionStatus.DECLINED:
        if (!transaction.recipientId) {
          return renderStatus(`❌ No deal: No one accepted ${sender}'s offer.`);
        } else {
          return renderStatus(
            `❌ No deal: There was an error processing ${sender}'s' offer.`
          );
        }
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
