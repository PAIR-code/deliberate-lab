import '../../pair-components/button';
import '../progress/progress_stage_completed';

import './chip_reveal_view';
import './stage_description';
import './stage_footer';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';
import {
  ChipAssistanceConfig,
  ChipAssistanceMode,
  ChipAssistanceType,
  ChipItem,
  ChipLogEntry,
  ChipLogType,
  ChipOffer,
  ChipStagePublicData,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  ChipTransaction,
  ChipTransactionStatus,
  SimpleChipLog,
  StageKind,
  ParticipantProfile,
  calculateChipOfferPayout,
  convertChipLogToPromptFormat,
  createChipOffer,
  displayChipOfferText,
  getChipLogs,
  isChipOfferAcceptable,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToDate} from '../../shared/utils';

import {styles} from './chip_view.scss';

/** Chip stage view for participants. */
@customElement('chip-participant-view')
export class ChipView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
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

  // Loading states for assistance buttons
  @state() isAssistanceNoneLoading = false;
  @state() isAssistanceAdvisorLoading = false;
  @state() isAssistanceCoachLoading = false;
  @state() isAssistanceDelegateLoading = false;

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

    const renderBody = () => {
      return html`
        <div class="reveal-panel">
          <chip-reveal-view .stage=${this.stage} .publicData=${publicData}>
          </chip-reveal-view>
        </div>
        <div class="bottom-panel-wrapper">
          <div class="game-panel">${this.renderLogsPanel()}</div>
          ${this.renderStatusPanel()}
        </div>
      `;
    };

    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="panel-wrapper">
        ${publicData.currentTurn === null ? this.renderStart() : renderBody()}
      </div>
      <stage-footer .disabled=${!publicData.isGameOver}>
        ${this.stage.progress.showParticipantProgress
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
      </stage-footer>
    `;
  }

  private renderStart() {
    const setTurn = async () => {
      if (!this.stage) return;
      this.isSetTurnLoading = true;
      await this.participantAnswerService.setChipTurn(this.stage.id);
      this.isSetTurnLoading = false;
    };

    return html`
      <div class="subpanel">
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

  private isAssistanceLoading() {
    return (
      this.isAssistanceNoneLoading ||
      this.isAssistanceAdvisorLoading ||
      this.isAssistanceCoachLoading ||
      this.isAssistanceDelegateLoading
    );
  }

  private renderStatusPanel() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (!publicData || publicData.kind !== StageKind.CHIP) {
      return nothing;
    }

    if (
      (!publicData.isGameOver &&
        this.participantService.completedStage(this.stage.id)) ||
      publicData.isGameOver
    ) {
      // If game was never started because participants transferred
      // from different stage
      // TODO: Show results from the cohort game that participant
      // was in
      // OR if game is over
      return html`
        <div class="status-panel">
          <div class="offer-panel">
            ‼️ This game has ended. Please continue to the next stage.
          </div>
        </div>
      `;
    }

    const isCurrentTurn = () => {
      if (publicData?.kind !== StageKind.CHIP) return false;

      return (
        publicData.currentTurn === this.participantService.profile?.publicId
      );
    };

    return html`
      <div class="status-panel-wrapper">
        <div class="status-panel">
          ${isCurrentTurn()
            ? this.renderSenderView()
            : this.renderRecipientView()}
        </div>
      </div>
    `;
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
    const publicData =
      this.cohortService.stagePublicDataMap[this.stage?.id ?? ''];
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
    if (this.isOfferPending()) {
      return html`
        <div class="offer-panel">
          Waiting for others to respond to your offer...
        </div>
      `;
    }

    const assistanceConfig = this.stage?.assistanceConfig;
    return html`
      <div class="offer-panel">
        <div class="offer-description">
          ✋ It's your turn! Make an offer to the other participants.
        </div>
        ${assistanceConfig
          ? this.renderAssistanceOffer(
              assistanceConfig.offerModes,
              this.sendOffer,
            )
          : this.renderManualOffer(this.sendOffer)}
      </div>
    `;
  }

  private renderAssistanceOffer(
    modes: ChipAssistanceMode[],
    sendOffer: () => void,
  ) {
    switch (this.answer?.currentAssistance?.selectedMode) {
      case ChipAssistanceMode.NONE:
        return this.renderManualOffer(sendOffer);
      case ChipAssistanceMode.DELEGATE:
        return this.renderDelegateButton(true);
      case ChipAssistanceMode.ADVISOR:
        return this.renderAdvisorOffer(true);
      case ChipAssistanceMode.COACH:
        return this.renderCoachOffer();
      default:
        break;
    }

    const renderManual = () => {
      return html`
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading()}
          ?loading=${this.isAssistanceNoneLoading}
          @click=${async () => {
            this.isAssistanceNoneLoading = true;
            await this.participantService.selectChipAssistanceMode(
              this.stage?.id ?? '',
              'none',
            );
            this.isAssistanceNoneLoading = false;
          }}
        >
          Manually submit my own offer
        </pr-button>
      `;
    };

    const renderCoach = () => {
      return html`
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading()}
          ?loading=${this.isAssistanceCoachLoading}
          @click=${async () => {
            this.isAssistanceCoachLoading = true;
            await this.participantService.selectChipAssistanceMode(
              this.stage?.id ?? '',
              'coach',
            );
            this.isAssistanceCoachLoading = false;
          }}
        >
          Give me feedback on my proposed offer
        </pr-button>
      `;
    };

    return html`
      ${modes.includes(ChipAssistanceMode.NONE) ? renderManual() : nothing}
      ${modes.includes(ChipAssistanceMode.DELEGATE)
        ? this.renderDelegateButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.ADVISOR)
        ? this.renderAdvisorButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.COACH) ? renderCoach() : nothing}
    `;
  }

  private renderManualOffer(
    sendOffer: () => void,
    loading = this.isOfferLoading,
    buttonText = 'Submit offer',
  ) {
    const renderOfferPayout = () => {
      if (this.isOfferIncomplete() || !this.isOfferValid()) {
        return nothing;
      }

      return this.renderDiffDisplay(
        'If this offer is accepted, your updated payout will be ',
        {[this.selectedBuyChip]: this.buyChipAmount},
        {[this.selectedSellChip]: this.sellChipAmount},
      );
    };

    const renderValidationMessages = () => {
      if (this.isOfferIncomplete()) {
        return nothing;
      }

      const errors: string[] = [];
      // Check if the offer is unacceptable
      const publicData =
        this.cohortService.stagePublicDataMap[this.stage?.id ?? ''];
      const isAcceptable =
        publicData?.kind === StageKind.CHIP
          ? isChipOfferAcceptable(
              this.selectedBuyChip,
              this.buyChipAmount,
              publicData,
              this.participantService.profile?.publicId ?? '',
            )
          : false;
      if (!isAcceptable) {
        errors.push(
          `⚠️ No other players have enough chips to accept your offer.`,
        );
      }
      if (
        !this.isOfferValid() &&
        this.getAvailableSell() < this.sellChipAmount
      ) {
        errors.push(`‼️ You cannot give more chips than you have.`);
      }
      if (this.selectedBuyChip === this.selectedSellChip) {
        errors.push(`‼️ You cannot offer to buy and sell the same chip type.`);
      }

      // Return all collected errors
      return html`
        <div class="warnings-panel">
          ${errors.map((error) => html`<div class="warning">${error}</div>`)}
        </div>
      `;
    };

    return html`
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
      <div class="buttons">
        <pr-button
          ?loading=${loading}
          ?disabled=${this.isOfferEmpty() ||
          !this.isOfferValid() ||
          this.isOfferPending()}
          @click=${sendOffer}
        >
          ${this.isOfferPending() ? 'Offer sent and pending...' : buttonText}
        </pr-button>
        <div>${renderOfferPayout()} ${renderValidationMessages()}</div>
      </div>
    `;
  }

  private renderChipNumberInput(
    value: number,
    onInput: (value: number) => void,
  ) {
    const updateInput = (e: Event) => {
      const value = Math.floor(
        parseInt((e.target as HTMLInputElement).value, 10),
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
          (chip) =>
            html`<option value=${chip.id}>${chip.avatar} ${chip.name}</option>`,
        )}
      </select>
    `;
  }

  private isResponsePending() {
    if (!this.stage) return;
    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return nothing;
    const participantId = this.participantService.profile?.publicId ?? '';
    const round = publicData.currentRound;
    const turn = publicData.currentTurn ?? '';
    const roundMap = publicData.participantOfferMap[round] ?? {};
    const transaction = roundMap[turn];
    return transaction && participantId in transaction.responseMap;
  }

  private renderRecipientView() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return nothing;

    const offer = this.getCurrentTransaction()?.offer ?? null;
    if (this.isResponsePending()) {
      return html`<div class="offer-panel">
        Waiting for others to respond...
      </div>`;
    }
    if (!offer) {
      return html`<div class="offer-panel">Waiting for an offer...</div>`;
    }

    const displayHypotheticalTotal = () => {
      if (!this.stage || !this.participantService.profile) return 0;

      const offer = this.getCurrentTransaction()?.offer ?? null;
      if (!offer) return nothing;

      if (this.canAcceptOffer(offer)) {
        return this.renderDiffDisplay(
          'If you accept this offer, your updated chip value will be ',
          offer.sell, // gained chips
          offer.buy, // lost chips
        );
      }

      return this.renderDiffDisplay(
        `⚠️ You do not have enough chips to accept this offer. If you could accept, your updated chip value would be `,
        offer.sell, // gained chips
        offer.buy, // lost chips
      );
    };

    const senderParticipant = this.cohortService
      .getAllParticipants()
      .find((p) => p.publicId === offer.senderId);
    if (!senderParticipant) return nothing;
    const senderName = `${getParticipantInlineDisplay(senderParticipant, false, this.stage?.id ?? '')}`;

    const assistanceConfig = this.stage?.assistanceConfig;
    return html`
      <div class="offer-panel">
        <div class="offer-description">Incoming offer!</div>
        <div>
          <p>
            ${senderName} is offering to give
            <b>${displayChipOfferText(offer.sell, this.stage.chips)}</b> to get
            <b>${displayChipOfferText(offer.buy, this.stage.chips)}</b> in
            return.
          </p>
          ${displayHypotheticalTotal()}
        </div>
        ${assistanceConfig
          ? this.renderAssistanceResponse(
              assistanceConfig.responseModes,
              this.acceptOffer,
              this.rejectOffer,
            )
          : this.renderManualResponse(this.acceptOffer, this.rejectOffer)}
      </div>
    `;
  }

  private renderAssistanceResponse(
    modes: ChipAssistanceMode[],
    acceptOffer: () => void,
    rejectOffer: () => void,
  ) {
    switch (this.answer?.currentAssistance?.selectedMode) {
      case ChipAssistanceMode.NONE:
        return this.renderManualResponse(acceptOffer, rejectOffer);
      case ChipAssistanceMode.DELEGATE:
        return this.renderDelegateButton(true);
      case ChipAssistanceMode.ADVISOR:
        return this.renderAdvisorResponse(true);
      case ChipAssistanceMode.COACH:
        return this.renderCoachResponse();
      default:
        break;
    }

    const renderManual = () => {
      return html`
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading()}
          ?loading=${this.isAssistanceNoneLoading}
          @click=${async () => {
            this.isAssistanceNoneLoading = true;
            await this.participantService.selectChipAssistanceMode(
              this.stage?.id ?? '',
              'none',
            );
            this.isAssistanceNoneLoading = false;
          }}
        >
          Manually submit my own response
        </pr-button>
      `;
    };

    const renderCoach = () => {
      return html`
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading()}
          ?loading=${this.isAssistanceCoachLoading}
          @click=${async () => {
            this.isAssistanceCoachLoading = true;
            await this.participantService.selectChipAssistanceMode(
              this.stage?.id ?? '',
              'coach',
            );
            this.isAssistanceCoachLoading = false;
          }}
        >
          Give me feedback on my proposed response
        </pr-button>
      `;
    };

    return html`
      ${modes.includes(ChipAssistanceMode.NONE) ? renderManual() : nothing}
      ${modes.includes(ChipAssistanceMode.DELEGATE)
        ? this.renderDelegateButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.ADVISOR)
        ? this.renderAdvisorButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.COACH) ? renderCoach() : nothing}
    `;
  }

  private renderManualResponse(
    acceptOffer: () => void,
    rejectOffer: () => void,
  ) {
    const offer = this.getCurrentTransaction()?.offer ?? null;
    if (this.isResponsePending()) {
      return html`<div class="offer-panel">
        Waiting for others to respond...
      </div>`;
    }
    if (!offer) {
      return html`<div class="offer-panel">Waiting for an offer...</div>`;
    }

    return html`
      <div class="buttons">
        <pr-tooltip
          text=${!this.canAcceptOffer(offer)
            ? 'You do not have enough chips to accept this offer.'
            : ''}
          position="BOTTOM_START"
        >
          <pr-button
            variant="tonal"
            ?loading=${this.isAcceptOfferLoading}
            ?disabled=${this.isResponsePending() || !this.canAcceptOffer(offer)}
            @click=${acceptOffer}
          >
            Accept offer
          </pr-button>
        </pr-tooltip>
        <pr-button
          color="error"
          variant="tonal"
          ?loading=${this.isRejectOfferLoading}
          ?disabled=${this.isResponsePending()}
          @click=${rejectOffer}
        >
          Reject offer
        </pr-button>
      </div>
    `;
  }

  private renderDiffDisplay(
    text: string,
    gainedChips: Record<string, number>,
    lostChips: Record<string, number>,
  ) {
    if (!this.stage || !this.participantService.profile) return nothing;
    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return nothing;

    const publicId = this.participantService.profile?.publicId ?? '';

    const payouts = calculateChipOfferPayout(
      publicData.participantChipMap[publicId] ?? {},
      publicData.participantChipValueMap[publicId] ?? {},
      gainedChips,
      lostChips,
    );

    const diff = payouts.after - payouts.before;
    return html`
      <div class="subtitle">
        ${text}
        <b>$${payouts.after.toFixed(2)}</b>
        <span class=${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}>
          <b>(${diff > 0 ? '+' : ''}${diff.toFixed(2)})</b> </span
        >.
      </div>
    `;
  }

  private renderLogsPanel() {
    if (!this.stage) return nothing;

    const publicData = this.cohortService.stagePublicDataMap[this.stage!.id];
    if (!publicData || publicData.kind !== StageKind.CHIP) return nothing;

    const participants = this.cohortService.getAllParticipants();
    const currentParticipantPublicId =
      this.participantService.profile?.publicId;

    const logs = getChipLogs(
      this.stage,
      publicData,
      participants,
      currentParticipantPublicId,
    );

    if (logs.length === 0) {
      return nothing;
    }

    return html`
      <div class="log-panel">
        <div class="log-scroll-outer-wrapper">
          <div class="log-scroll-inner-wrapper">
            ${logs.map((entry, index, array) => {
              const isLastEntry = index === array.length - 1;
              return this.renderLogEntry(entry, index === logs.length - 1);
            })}
          </div>
        </div>
      </div>
    `;
  }

  private async sendOffer() {
    if (!this.stage) return;
    this.isOfferLoading = true;

    const chipOffer: Partial<ChipOffer> = {
      senderId: this.participantService.profile?.publicId,
      buy: {[this.selectedBuyChip]: this.buyChipAmount},
      sell: {[this.selectedSellChip]: this.sellChipAmount},
    };

    await this.participantService.sendParticipantChipOffer(
      this.stage.id,
      createChipOffer(chipOffer),
    );

    this.isOfferLoading = false;
    this.resetChipValues();
  }

  private canAcceptOffer(offer: ChipOffer) {
    if (!this.stage) return;
    const publicData = this.cohortService.stagePublicDataMap[this.stage.id];
    if (publicData?.kind !== StageKind.CHIP) return nothing;

    const buyChip = Object.keys(offer.buy)[0];

    const publicId = this.participantService.profile?.publicId ?? '';
    const participantChipMap = publicData.participantChipMap[publicId] ?? {};
    const availableSell = participantChipMap[buyChip] ?? 0;

    return availableSell >= offer.buy[buyChip];
  }

  private async acceptOffer() {
    if (!this.stage) return;
    this.isAcceptOfferLoading = true;
    await this.participantService.sendParticipantChipResponse(
      this.stage.id,
      true,
    );
    this.resetChipValues(); // includes resetting assistance mode
    this.isAcceptOfferLoading = false;
  }

  private async rejectOffer() {
    if (!this.stage) return;
    this.isRejectOfferLoading = true;
    await this.participantService.sendParticipantChipResponse(
      this.stage.id,
      false,
    );
    this.resetChipValues(); // includes resetting assistance mode
    this.isRejectOfferLoading = false;
  }

  private renderDelegateButton(disabled = false) {
    return html`
      <div class="button-wrapper">
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading()}
          ?loading=${this.isAssistanceDelegateLoading}
          @click=${async () => {
            this.isAssistanceDelegateLoading = true;
            const response =
              await this.participantService.selectChipAssistanceMode(
                this.stage?.id ?? '',
                'delegate',
              );
            this.isAssistanceDelegateLoading = false;
            this.resetChipValues(); // includes resetting assistance mode
          }}
        >
          Delegate decision to agent
        </pr-button>
      </div>
      ${this.getAssistanceMessage()}
    `;
  }

  private getAssistanceMessage() {
    return this.answer?.currentAssistance?.message ?? '';
  }

  private renderAdvisorButton(disabled = false) {
    return html`
      <div class="button-wrapper">
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading()}
          ?loading=${this.isAssistanceAdvisorLoading}
          @click=${async () => {
            this.isAssistanceAdvisorLoading = true;
            const response =
              await this.participantService.selectChipAssistanceMode(
                this.stage?.id ?? '',
                'advisor',
              );
            this.isAssistanceAdvisorLoading = false;
          }}
        >
          Get advice on what to do
        </pr-button>
      </div>
    `;
  }

  private renderAdvisorOffer(disabled = false) {
    return html`
      ${this.renderAdvisorButton(disabled)} ${this.getAssistanceMessage()}
      ${this.answer?.currentAssistance?.proposedTime
        ? this.renderManualOffer(this.sendOffer)
        : nothing}
    `;
  }

  private renderAdvisorResponse(disabled = false) {
    return html`
      ${this.renderAdvisorButton(disabled)} ${this.getAssistanceMessage()}
      ${this.answer?.currentAssistance?.proposedTime
        ? this.renderManualResponse(this.acceptOffer, this.rejectOffer)
        : nothing}
    `;
  }

  private renderCoachOffer() {
    if (this.answer?.currentAssistance?.proposedTime) {
      const proposedOffer =
        this.answer?.currentAssistance?.type === ChipAssistanceType.OFFER
          ? this.answer.currentAssistance.proposedOffer
          : null;
      // TODO: Convert object into description
      const proposal = proposedOffer
        ? `You proposed giving ${JSON.stringify(proposedOffer.sell)} to get ${JSON.stringify(proposedOffer.buy)}`
        : '';
      return html`
        <div>${proposal}</div>
        <div>${this.getAssistanceMessage()}</div>
        ${this.renderManualOffer(this.sendOffer)}
      `;
    }

    const sendCoachProposal = async () => {
      this.isAssistanceCoachLoading = true;
      const response = await this.participantService.requestChipAssistance(
        this.stage?.id ?? '',
        'coach',
        this.selectedBuyChip,
        this.buyChipAmount,
        this.selectedSellChip,
        this.sellChipAmount,
      );
      this.isAssistanceCoachLoading = false;
    };
    return html`
      <div>Submit your proposal below and I'll give you feedback:</div>
      ${this.renderManualOffer(
        sendCoachProposal,
        this.isAssistanceCoachLoading,
        'Submit proposed offer',
      )}
    `;
  }

  private renderCoachResponse() {
    if (this.answer?.currentAssistance?.proposedTime) {
      const proposedResponse =
        this.answer?.currentAssistance?.type === ChipAssistanceType.RESPONSE
          ? this.answer.currentAssistance.proposedResponse
          : null;
      const proposal =
        proposedResponse !== null
          ? proposedResponse
            ? `You proposed accepting the offer`
            : `You proposed rejecting the offer`
          : '';
      return html`
        <div>${proposal}</div>
        <div>${this.getAssistanceMessage()}</div>
        <div>Now, submit your final response to the offer:</div>
        ${this.renderManualResponse(this.acceptOffer, this.rejectOffer)}
      `;
    }

    const acceptProposal = async () => {
      this.isAcceptOfferLoading = true; // temporary
      this.isAssistanceCoachLoading = true;
      const response = await this.participantService.requestChipAssistance(
        this.stage?.id ?? '',
        'coach',
        this.selectedBuyChip,
        this.buyChipAmount,
        this.selectedSellChip,
        this.sellChipAmount,
        true,
      );
      this.isAssistanceCoachLoading = false;
      this.isAcceptOfferLoading = false; // temporary
    };

    const rejectProposal = async () => {
      this.isRejectOfferLoading = true; // temporary
      this.isAssistanceCoachLoading = true;
      const response = await this.participantService.requestChipAssistance(
        this.stage?.id ?? '',
        'coach',
        this.selectedBuyChip,
        this.buyChipAmount,
        this.selectedSellChip,
        this.sellChipAmount,
        false,
      );
      this.isAssistanceCoachLoading = false;
      this.isRejectOfferLoading = false; // temporary
    };
    return html`
      <div>Submit your proposal below and I'll give you feedback:</div>
      ${this.renderManualResponse(acceptProposal, rejectProposal)}
    `;
  }

  private renderLogEntry(log: SimpleChipLog, isLatestEntry: boolean = false) {
    if (!this.stage) return nothing;
    const cssClasses = classMap({
      plain: !log.timestamp,
    });

    return html`
      <div class="log-entry ${cssClasses}">
        <div class="subtitle">
          ${log.timestamp ? convertUnifiedTimestampToDate(log.timestamp) : ''}
        </div>
        <div>${log.message}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chip-participant-view': ChipView;
  }
}
