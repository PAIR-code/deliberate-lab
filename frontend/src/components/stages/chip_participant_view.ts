import '../../pair-components/button';
import '../progress/progress_stage_completed';

import './chip_reveal_view';
import './stage_description';
import './stage_footer';
import '../../pair-components/tooltip';

import {MobxLitElement} from '@adobe/lit-mobx';
import {css, CSSResultGroup, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {core} from '../../core/core';
import {AuthService} from '../../services/auth.service';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {getParticipantInlineDisplay} from '../../shared/participant.utils';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {
  ChipAssistanceMode,
  ChipAssistanceType,
  ChipOffer,
  ChipStagePublicData,
  ChipStageConfig,
  ChipStageParticipantAnswer,
  SimpleChipLog,
  StageKind,
  calculateChipOfferPayout,
  createChipOffer,
  displayChipOfferText,
  getChipLogs,
  getChipOfferChecks,
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

  @state() isAcceptOfferLoading = false;
  @state() isRejectOfferLoading = false;
  @state() isSetTurnLoading = false;

  // Loading states for assistance buttons
  @state() isAssistanceNoneLoading = false;
  @state() isAssistanceAdvisorLoading = false;
  @state() isAssistanceCoachLoading = false;
  @state() isAssistanceDelegateLoading = false;

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

  // Fallback to Manual for System Error
  private renderErrorOffer() {
    return html`
      <div class="warning">
        ⚠️ A System Error occurred. Please proceed manually.
      </div>
      ${this.renderManualOffer(this.sendOffer)}
    `;
  }

  private renderErrorResponse() {
    return html`
      <div class="warning">
        ⚠️ A System Error occurred. Please proceed manually.
      </div>
      ${this.renderManualResponse(this.acceptOffer, this.rejectOffer)}
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

  private renderSenderView() {
    const isOfferPending = this.getCurrentTransaction()?.offer;
    if (isOfferPending) {
      // TODO: Check the participant's answer for the last chip
      // assistance. If it was a 'delegate' and corresponds with the
      // current round / turn marked in public data, then extract
      // the model's explanation for the delegated offer and display that
      // instead.
      const publicData = this.cohortService.stagePublicDataMap[
        this.stage?.id ?? ''
      ] as ChipStagePublicData;
      const currentRound = publicData?.currentRound;
      const participantId = this.participantService.profile?.publicId ?? '';

      // Step 1: search delegate assistance
      const history = this.answer?.assistanceHistory ?? [];

      const delegateMove = history.find(
        (move) =>
          move.selectedMode === ChipAssistanceMode.DELEGATE &&
          move.type === ChipAssistanceType.OFFER &&
          move.round === currentRound &&
          move.turn === participantId,
      );

      if (delegateMove?.message) {
        return html`
          <div class="offer-panel">
            <b>💡 Reasons for making this offer:</b>
            <div>${delegateMove.message}</div>
            <div>--------------------------------------</div>
            <div>Waiting for others to respond to your offer...</div>
          </div>
        `;
      }

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
    // If the user already selected an assistance mode, render
    // that specific mode
    switch (this.answer?.currentAssistance?.selectedMode) {
      case ChipAssistanceMode.NONE:
        return this.renderManualOffer(sendOffer);
      case ChipAssistanceMode.DELEGATE:
        return this.renderDelegateOfferButton(true);
      case ChipAssistanceMode.ADVISOR:
        return this.renderAdvisorOffer(true);
      case ChipAssistanceMode.COACH:
        return this.renderCoachOffer();
      case ChipAssistanceMode.ERROR:
        return this.renderErrorOffer();
      default:
        break;
    }

    // Otherwise, render buttons to select available assistance modes
    return html`
      ${modes.includes(ChipAssistanceMode.NONE)
        ? this.renderSelectManualOfferButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.DELEGATE)
        ? this.renderDelegateOfferButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.ADVISOR)
        ? this.renderAdvisorButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.COACH)
        ? this.renderSelectCoachOfferButton()
        : nothing}
    `;
  }

  private renderSelectManualOfferButton() {
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
  }

  private renderSelectCoachOfferButton() {
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
  }

  private renderManualOffer(
    sendOffer: (
      selectedBuyChip: string,
      buyChipAmount: number,
      selectedSellChip: string,
      sellChipAmount: number,
    ) => void,
    selectedBuyChip = '', // default to pass to offer form
    buyChipAmount = 0, // default to pass to offer form
    selectedSellChip = '', // default to pass to offer form
    sellChipAmount = 0, // default to pass to offer form
    isLoading = false,
    buttonText = 'Submit offer',
  ) {
    const publicData =
      this.cohortService.stagePublicDataMap[this.stage?.id ?? ''];
    if (publicData?.kind !== StageKind.CHIP) return nothing;

    const isOfferPending = this.getCurrentTransaction()?.offer;

    // WARNING: Temporary hack converts chip type IDs to uppercase because
    // we expect that for the "chip negotiation template" and the model
    // sometimes returns lowercase IDs in the proposal
    return html`
      <chip-offer-form
        .stage=${this.stage}
        .publicData=${publicData}
        .participantPublicId=${this.participantService.profile?.publicId ?? ''}
        .sendOffer=${sendOffer}
        .isPending=${isLoading || isOfferPending}
        .buttonText=${buttonText}
        selectedBuyChip=${selectedBuyChip}
        buyChipAmount=${buyChipAmount}
        selectedSellChip=${selectedSellChip}
        sellChipAmount=${sellChipAmount}
      >
      </chip-offer-form>
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
    // If the user already selected an assistance mode, render
    // that specific mode
    switch (this.answer?.currentAssistance?.selectedMode) {
      case ChipAssistanceMode.NONE:
        return this.renderManualResponse(acceptOffer, rejectOffer);
      case ChipAssistanceMode.DELEGATE:
        return this.renderDelegateResponseButton(true);
      case ChipAssistanceMode.ADVISOR:
        return this.renderAdvisorResponse(true);
      case ChipAssistanceMode.COACH:
        return this.renderCoachResponse();
      case ChipAssistanceMode.ERROR:
        return this.renderErrorResponse();
      default:
        break;
    }

    // Otherwise, render buttons to select available assistance modes
    return html`
      ${modes.includes(ChipAssistanceMode.NONE)
        ? this.renderSelectManualResponseButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.DELEGATE)
        ? this.renderDelegateResponseButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.ADVISOR)
        ? this.renderAdvisorButton()
        : nothing}
      ${modes.includes(ChipAssistanceMode.COACH)
        ? this.renderSelectCoachResponseButton()
        : nothing}
    `;
  }

  private renderSelectManualResponseButton() {
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
  }

  private renderSelectCoachResponseButton() {
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
  }

  private renderManualResponse(
    acceptOffer: () => void,
    rejectOffer: () => void,
  ) {
    const offer = this.getCurrentTransaction()?.offer ?? null;
    if (this.isResponsePending()) {
      // TODO: Check the participant's answer for the last chip
      // assistance. If it was a 'delegate' and corresponds with the
      // current round / turn marked in public data, then extract
      // the model's explanation for the delegated response and display that
      // instead.
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

  // TODO: Move to shared function
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
            ${logs.map((entry) => {
              return this.renderLogEntry(entry);
            })}
          </div>
        </div>
      </div>
    `;
  }

  private async sendOffer(
    selectedBuyChip = '',
    buyChipAmount = 0,
    selectedSellChip = '',
    sellChipAmount = 0,
  ) {
    if (!this.stage) return;

    const chipOffer: Partial<ChipOffer> = {
      senderId: this.participantService.profile?.publicId,
      buy: {[selectedBuyChip]: buyChipAmount},
      sell: {[selectedSellChip]: sellChipAmount},
    };

    await this.participantService.sendParticipantChipOffer(
      this.stage.id,
      createChipOffer(chipOffer),
    );
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
    this.isAcceptOfferLoading = false;
  }

  private async rejectOffer() {
    if (!this.stage) return;
    this.isRejectOfferLoading = true;
    await this.participantService.sendParticipantChipResponse(
      this.stage.id,
      false,
    );
    this.isRejectOfferLoading = false;
  }

  private renderDelegateOfferButton(disabled = false) {
    return html`
      <div class="button-wrapper">
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading() || disabled}
          ?loading=${this.isAssistanceDelegateLoading}
          @click=${async () => {
            this.isAssistanceDelegateLoading = true;
            await this.participantService.selectChipAssistanceMode(
              this.stage?.id ?? '',
              'delegate', // offer context
            );
            this.isAssistanceDelegateLoading = false;
          }}
        >
          Delegate decision to agent
        </pr-button>
      </div>
      ${this.getDelegateMessage()}
    `;
  }

  private renderDelegateResponseButton(disabled = false) {
    return html`
      <div class="button-wrapper">
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading() || disabled}
          ?loading=${this.isAssistanceDelegateLoading}
          @click=${async () => {
            this.isAssistanceDelegateLoading = true;
            // null as third argument means: delegate decides to accept or reject
            await this.participantService.selectChipAssistanceMode(
              this.stage?.id ?? '',
              'delegate',
            );
            this.isAssistanceDelegateLoading = false;
          }}
        >
          Delegate decision to agent
        </pr-button>
      </div>
      ${this.getDelegateMessage()}
    `;
  }

  private getDelegateMessage() {
    return this.answer?.currentAssistance?.message ?? '';
  }

  private getCoachMessage() {
    return this.answer?.currentAssistance?.message ?? '';
  }

  private getAssistanceMessage() {
    const assistance = this.answer?.currentAssistance;
    if (!assistance || !assistance.type) {
      // Assistance not yet available or malformed
      return nothing;
    }

    const message = this.answer?.currentAssistance?.message ?? '';
    const type = this.answer?.currentAssistance?.type;
    let proposalLine = '<b>💡 AI Assistant says:</b>';
    if (type === ChipAssistanceType.OFFER) {
      const proposedOffer = this.answer?.currentAssistance?.proposedOffer;
      if (proposedOffer) {
        proposalLine += ` give ${this.describeChipMap(proposedOffer.sell)} to get ${this.describeChipMap(proposedOffer.buy)}.`;
      }
    } else if (type === ChipAssistanceType.RESPONSE) {
      const proposedResponse = this.answer?.currentAssistance?.proposedResponse;
      if (proposedResponse !== undefined && proposedResponse !== null) {
        const responseStr = proposedResponse ? 'Accept' : 'Reject';
        proposalLine += ` ${responseStr} the offer.`;
      }
    }
    return html`
      <div>${unsafeHTML(proposalLine)}</div>
      <div>${message}</div>
    `;
  }

  private renderAdvisorButton(disabled = false) {
    return html`
      <div class="button-wrapper">
        <pr-button
          color="secondary"
          variant="tonal"
          ?disabled=${this.isAssistanceLoading() || disabled}
          ?loading=${this.isAssistanceAdvisorLoading}
          @click=${async () => {
            this.isAssistanceAdvisorLoading = true;
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
    const renderOfferForm = () => {
      const currentAssistance = this.answer?.currentAssistance;
      if (
        !currentAssistance?.proposedTime ||
        currentAssistance.type !== ChipAssistanceType.OFFER
      ) {
        return nothing;
      }

      // Extract suggested values from current move
      // TODO: Refactor into shared function
      const offer = currentAssistance.proposedOffer;
      if (!offer) return nothing;
      // Quick hack to extract types as there is current only one type
      // per offer
      const suggestedBuyType = Object.keys(offer.buy).join('');
      const suggestedSellType = Object.keys(offer.sell).join('');
      const suggestedBuyAmount = offer.buy[suggestedBuyType];
      const suggestedSellAmount = offer.sell[suggestedSellType];

      return this.renderManualOffer(
        this.sendOffer,
        suggestedBuyType,
        suggestedBuyAmount,
        suggestedSellType,
        suggestedSellAmount,
      );
    };

    return html`
      ${this.renderAdvisorButton(disabled)} ${this.getAssistanceMessage()}
      ${renderOfferForm()}
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

  private describeChipMap(chipMap: Record<string, number>): string {
    return Object.entries(chipMap)
      .map(
        ([chip, quantity]) =>
          `${quantity} ${chip} chip${quantity > 1 ? 's' : ''}`,
      )
      .join(', ');
  }

  private renderCoachOffer() {
    if (this.answer?.currentAssistance?.proposedTime) {
      const proposedOffer =
        this.answer?.currentAssistance?.type === ChipAssistanceType.OFFER
          ? this.answer.currentAssistance.proposedOffer
          : null;
      // Convert object into description
      const proposal = proposedOffer
        ? html`<b>Initial Proposal:</b> to give
            ${this.describeChipMap(proposedOffer.sell)} to get
            ${this.describeChipMap(proposedOffer.buy)}`
        : nothing;

      // TODO: Refactor into shared function
      // Quick hack to extract types as there is current only one type
      // per offer
      const suggestedBuyType = Object.keys(proposedOffer?.buy ?? {}).join('');
      const suggestedSellType = Object.keys(proposedOffer?.sell ?? {}).join('');
      const suggestedBuyAmount = proposedOffer?.buy[suggestedBuyType] ?? 0;
      const suggestedSellAmount = proposedOffer?.sell[suggestedSellType] ?? 0;
      return html`
        <div>${proposal}</div>
        <div><b>Feedback:</b> ${this.getCoachMessage()}</div>
        ${this.renderManualOffer(
          this.sendOffer,
          suggestedBuyType,
          suggestedBuyAmount,
          suggestedSellType,
          suggestedSellAmount,
        )}
      `;
    }

    const sendCoachProposal = async (
      selectedBuyChip = '',
      buyChipAmount = 0,
      selectedSellChip = '',
      sellChipAmount = 0,
    ) => {
      this.isAssistanceCoachLoading = true;
      await this.participantService.requestChipAssistance(
        this.stage?.id ?? '',
        'coach',
        selectedBuyChip,
        buyChipAmount,
        selectedSellChip,
        sellChipAmount,
      );
      this.isAssistanceCoachLoading = false;
    };
    return html`
      <div>Submit your proposal below and I'll give you feedback:</div>
      ${this.renderManualOffer(
        sendCoachProposal,
        '',
        0,
        '',
        0,
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
          ? html`<b>Initial Response:</b> ${proposedResponse
                ? 'Accept'
                : 'Reject'}
              the offer`
          : nothing;
      return html`
        <div>${proposal}</div>
        <div><b>Feedback:</b> ${this.getAssistanceMessage()}</div>
        <div>Now, submit your final response to the offer:</div>
        ${this.renderManualResponse(this.acceptOffer, this.rejectOffer)}
      `;
    }

    const acceptProposal = async () => {
      this.isAcceptOfferLoading = true; // temporary
      this.isAssistanceCoachLoading = true;
      await this.participantService.requestChipAssistance(
        this.stage?.id ?? '',
        'coach',
        '', // buy chip is N/A for response assistance
        0, // buy amount is N/A for response assistance
        '', // sell chip is N/A for response assistance
        0, // buy amount is N/A for response assistance
        true,
      );
      this.isAssistanceCoachLoading = false;
      this.isAcceptOfferLoading = false; // temporary
    };

    const rejectProposal = async () => {
      this.isRejectOfferLoading = true; // temporary
      this.isAssistanceCoachLoading = true;
      await this.participantService.requestChipAssistance(
        this.stage?.id ?? '',
        'coach',
        '', // buy chip is N/A for response assistance
        0, // buy amount is N/A for response assistance
        '', // sell chip is N/A for response assistance
        0, // buy amount is N/A for response assistance
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

  private renderLogEntry(log: SimpleChipLog) {
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

/** Chip offer submission form. */
@customElement('chip-offer-form')
export class ChipOfferForm extends MobxLitElement {
  static override styles: CSSResultGroup = [
    styles,
    css`
      :host {
        height: max-content;
      }
    `,
  ];

  private readonly authService = core.getService(AuthService);
  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property() stage: ChipStageConfig | undefined = undefined;
  @property() publicData: ChipStagePublicData | undefined = undefined;
  @property() participantPublicId = '';
  @property() buttonText = 'Submit offer';
  @property() isPending = false; // Button is pending
  @property() sendOffer: (
    selectedBuyChip: string,
    buyChipAmount: number,
    selectedSellChip: string,
    sellChipAmount: number,
  ) => void = (
    selectedBuyChip: string,
    buyChipAmount: number,
    selectedSellChip: string,
    sellChipAmount: number,
  ) => {};

  @state() isLoading = false;

  // Offer interface variables
  @property() selectedBuyChip: string = '';
  @property() selectedSellChip: string = '';
  @property() buyChipAmount: number = 0;
  @property() sellChipAmount: number = 0;

  override render() {
    if (!this.publicData) return nothing;

    const checks = getChipOfferChecks(
      this.publicData,
      this.participantPublicId,
      this.selectedBuyChip,
      this.buyChipAmount,
      this.selectedSellChip,
      this.sellChipAmount,
    );

    const renderOfferPayout = () => {
      if (!checks.isCompleteOffer || !checks.isValidOffer) {
        return nothing;
      }

      return this.renderDiffDisplay(
        'If this offer is accepted, your updated payout will be ',
        {[this.selectedBuyChip]: this.buyChipAmount},
        {[this.selectedSellChip]: this.sellChipAmount},
      );
    };

    const sendOffer = async () => {
      this.isLoading = true;
      await this.sendOffer(
        this.selectedBuyChip,
        this.buyChipAmount,
        this.selectedSellChip,
        this.sellChipAmount,
      );
      this.isLoading = false;
    };

    const renderWarnings = () => {
      if (!checks.isCompleteOffer) return nothing;
      return html`
        <div class="warnings-panel">
          ${checks.errors.map(
            (error) => html`<div class="warning">${error}</div>`,
          )}
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
          ?loading=${this.isLoading}
          ?disabled=${!checks.isCompleteOffer ||
          !checks.isValidOffer ||
          this.isPending}
          @click=${sendOffer}
        >
          ${this.isPending ? 'Pending...' : this.buttonText}
        </pr-button>
        <div>${renderOfferPayout()} ${renderWarnings()}</div>
      </div>
    `;
  }

  private renderChipNumberInput(
    value: number,
    onInput: (value: number) => void,
  ) {
    const updateInput = (e: Event) => {
      const input = (e.target as HTMLInputElement).value;
      const parsed = parseInt(input, 10);
      const value = Number.isNaN(parsed) ? 0 : Math.max(0, Math.floor(parsed));

      onInput(Math.max(0, value));
    };

    return html`
      <div class="number-input">
        <input
          .disabled=${this.isPending}
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
        .disabled=${this.isPending}
        .value=${value}
        @change=${(e: Event) => {
          onInput((e.target as HTMLSelectElement).value);
        }}
      >
        <option value=""></option>
        ${this.stage?.chips.map(
          (chip) =>
            html`<option value=${chip.id} ?selected=${chip.id === value}>
              ${chip.avatar} ${chip.name}
            </option>`,
        )}
      </select>
    `;
  }

  // TODO: Move to shared function
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
}

declare global {
  interface HTMLElementTagNameMap {
    'chip-participant-view': ChipView;
    'chip-offer-form': ChipOfferForm;
  }
}
