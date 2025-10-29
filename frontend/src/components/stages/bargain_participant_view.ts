import '../../pair-components/button';
import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {core} from '../../core/core';
import {CohortService} from '../../services/cohort.service';
import {ParticipantService} from '../../services/participant.service';

import {
  BargainRole,
  BargainStageConfig,
  BargainStageParticipantAnswer,
  BargainStagePublicData,
  BargainTransactionStatus,
  StageKind,
} from '@deliberation-lab/utils';

import {styles} from './bargain_view.scss';

/** Bargain stage view for participants. */
@customElement('bargain-participant-view')
export class BargainParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly cohortService = core.getService(CohortService);
  private readonly participantService = core.getService(ParticipantService);

  @property() stage: BargainStageConfig | null = null;
  @property() answer: BargainStageParticipantAnswer | null = null;

  // Local state for input fields
  @property() private offerPrice: number = 0;
  @property() private offerMessage: string = '';
  @property() private responseMessage: string = '';
  @property() private errorMessage: string = '';

  override render() {
    if (!this.stage) {
      return nothing;
    }

    const publicData = this.cohortService.stagePublicDataMap[
      this.stage.id
    ] as BargainStagePublicData | undefined;

    if (!publicData || publicData.kind !== StageKind.BARGAIN) {
      return nothing;
    }

    // Check if game hasn't started yet (initialization phase)
    if (publicData.currentTurn === 0 || !this.answer) {
      return this.renderInitializationPhase();
    }

    return html`
      <div class="bargain-container">
        <div class="left-column">
          ${this.renderInfoPanel()}
          ${this.renderOpponentInfoPanel()}
          ${this.renderActionPanel(publicData)}
        </div>
        <div class="right-column">
          ${this.renderDialoguePanel(publicData)}
        </div>
      </div>
      ${publicData.isGameOver
        ? html`
            <stage-footer .disabled=${false}>
              <progress-stage-completed></progress-stage-completed>
            </stage-footer>
          `
        : nothing}
    `;
  }

  private renderInitializationPhase() {
    return html`
      <stage-description .stage=${this.stage}></stage-description>
      <div class="bargain-container">
        <div class="panel" style="margin: auto; max-width: 600px; text-align: center;">
          <h3 class="panel-title">Waiting for Game to Start...</h3>
          <p style="margin: 20px 0; color: var(--md-sys-color-on-surface-variant);">
            The negotiation will begin once both participants are ready.
            You will be assigned a role (buyer or seller) and a valuation for the item.
          </p>
          <p style="color: var(--md-sys-color-secondary);">
            Please wait while the game is being set up...
          </p>
        </div>
      </div>
    `;
  }

  private renderInfoPanel() {
    if (!this.answer) return nothing;

    const role = this.answer.role;
    const valuation = this.answer.valuation;
    const profitFormula = role === BargainRole.BUYER
      ? `Profit = Your Valuation - Price = $${valuation} - Price`
      : `Profit = Price - Your Valuation = Price - $${valuation}`;

    return html`
      <div class="panel">
        <h3 class="panel-title">Info About You</h3>
        <div class="info-row">
          <span class="info-label">Your Role:</span>
          <span class="role-badge ${role}">${role}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Your Valuation:</span>
          <span class="info-value">$${valuation}</span>
        </div>
        <div class="profit-formula">${profitFormula}</div>
      </div>
    `;
  }

  private renderOpponentInfoPanel() {
    if (!this.answer) return nothing;

    const role = this.answer.role;
    const opponentRole = role === BargainRole.BUYER ? 'Seller' : 'Buyer';

    return html`
      <div class="panel">
        <h3 class="panel-title">Info About Opponent</h3>
        <div class="info-row">
          <span class="info-label">Opponent Role:</span>
          <span class="role-badge ${role === BargainRole.BUYER ? 'seller' : 'buyer'}">
            ${opponentRole}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Opponent Valuation:</span>
          <span class="info-value">${this.answer.opponentInfo}</span>
        </div>
      </div>
    `;
  }

  private renderActionPanel(publicData: BargainStagePublicData) {
    if (!this.answer || !this.stage) return nothing;

    const isMyTurn = publicData.currentOfferer === this.participantService.profile?.publicId;
    const currentTransaction = publicData.transactions[publicData.transactions.length - 1];
    const isPendingResponse = currentTransaction && currentTransaction.status === BargainTransactionStatus.PENDING;
    const amIRespondent = isPendingResponse && currentTransaction.offer.senderId !== this.participantService.profile?.publicId;

    return html`
      <div class="panel action-panel">
        <h3 class="panel-title">Action Panel</h3>
        <div class="info-row" style="margin-bottom: 12px; padding: 8px; background-color: var(--md-sys-color-surface-container-low); border-radius: 4px;">
          <span class="info-label">Maximum number of turns:</span>
          <span class="info-value" style="font-weight: 600;">${this.answer.maxTurns}</span>
        </div>
        ${this.errorMessage ? html`<div class="error-message">${this.errorMessage}</div>` : nothing}
        ${isMyTurn && !isPendingResponse
          ? this.renderOfferInput()
          : amIRespondent
            ? this.renderResponseInput(currentTransaction.offer.price)
            : html`<div class="waiting-message">Waiting for opponent...</div>`
        }
      </div>
    `;
  }

  private renderOfferInput() {
    if (!this.answer) return nothing;

    return html`
      <div class="input-group">
        <label class="input-label">Enter your offer price:</label>
        <input
          type="number"
          class="price-input"
          .value=${this.offerPrice.toString()}
          @input=${(e: Event) => {
            this.offerPrice = Number((e.target as HTMLInputElement).value);
          }}
          placeholder="Enter price"
          min="0"
          step="1"
        />
      </div>
      ${this.answer.chatAllowed ? html`
        <div class="input-group">
          <label class="input-label">Optional message:</label>
          <textarea
            class="chat-input"
            .value=${this.offerMessage}
            @input=${(e: Event) => {
              this.offerMessage = (e.target as HTMLTextAreaElement).value;
            }}
            placeholder="Add a message (optional)"
          ></textarea>
        </div>
      ` : nothing}
      <pr-button
        color="primary"
        variant="default"
        @click=${this.handleSendOffer}
      >
        Send Offer
      </pr-button>
    `;
  }

  private renderResponseInput(offerPrice: number) {
    if (!this.answer) return nothing;

    return html`
      <div class="info-row" style="margin-bottom: 16px;">
        <span class="info-label">Current Offer:</span>
        <span class="offer-price">$${offerPrice}</span>
      </div>
      ${this.answer.chatAllowed ? html`
        <div class="input-group">
          <label class="input-label">Optional message:</label>
          <textarea
            class="chat-input"
            .value=${this.responseMessage}
            @input=${(e: Event) => {
              this.responseMessage = (e.target as HTMLTextAreaElement).value;
            }}
            placeholder="Add a message (optional)"
          ></textarea>
        </div>
      ` : nothing}
      <div class="action-buttons">
        <pr-button
          color="primary"
          variant="default"
          @click=${() => this.handleSendResponse(true)}
        >
          Accept
        </pr-button>
        <pr-button
          color="secondary"
          variant="default"
          @click=${() => this.handleSendResponse(false)}
        >
          Reject
        </pr-button>
      </div>
    `;
  }

  private renderDialoguePanel(publicData: BargainStagePublicData) {
    if (!this.answer) return nothing;

    return html`
      <div class="panel dialogue-panel">
        <h3 class="panel-title">Negotiation History</h3>
        <div class="turn-indicator">
          Turn ${publicData.currentTurn} of ${this.answer.maxTurns}
        </div>
        <div class="dialogue-history">
          ${publicData.transactions.length === 0
            ? html`<div class="waiting-message">No offers yet. Negotiation will begin shortly...</div>`
            : publicData.transactions.map((transaction, index) => this.renderTransaction(transaction, index + 1))
          }
          ${publicData.isGameOver ? this.renderGameSummaryInHistory(publicData) : nothing}
        </div>
      </div>
    `;
  }

  private renderTransaction(transaction: any, turnNumber: number) {
    const offer = transaction.offer;
    const response = transaction.response;
    const status = transaction.status;

    const statusClass = status === BargainTransactionStatus.ACCEPTED
      ? 'accepted'
      : status === BargainTransactionStatus.REJECTED
        ? 'rejected'
        : 'pending';

    const statusText = status === BargainTransactionStatus.ACCEPTED
      ? '✓ Accepted'
      : status === BargainTransactionStatus.REJECTED
        ? '✗ Rejected'
        : '⏳ Pending';

    const senderRole = this.getSenderRole(offer.senderId);

    return html`
      <div class="transaction-item ${statusClass}">
        <div class="transaction-header">
          <span class="transaction-turn">Turn ${turnNumber}</span>
          <span class="transaction-status ${statusClass}">${statusText}</span>
        </div>
        <div class="transaction-offer">
          <div class="offer-price">$${offer.price}</div>
          <div class="offer-sender">Offered by ${senderRole}</div>
        </div>
        ${offer.message ? html`
          <div class="chat-message">"${offer.message}"</div>
        ` : nothing}
        ${response && response.message ? html`
          <div class="chat-message">"${response.message}"</div>
        ` : nothing}
      </div>
    `;
  }

  private getSenderRole(senderId: string): string {
    const publicData = this.cohortService.stagePublicDataMap[
      this.stage?.id ?? ''
    ] as BargainStagePublicData | undefined;

    if (!publicData) return 'Unknown';

    if (senderId === publicData.buyerId) {
      return 'Buyer';
    } else if (senderId === publicData.sellerId) {
      return 'Seller';
    }
    return 'Unknown';
  }

  private renderGameSummaryInHistory(publicData: BargainStagePublicData) {
    const dealReached = publicData.agreedPrice !== null;

    if (dealReached) {
      return html`
        <div class="transaction-item game-over accepted">
          <div class="transaction-header">
            <span class="transaction-turn">Game Over</span>
            <span class="transaction-status accepted">✓ Deal Reached!</span>
          </div>
          <div class="transaction-offer">
            <div class="offer-price">$${publicData.agreedPrice}</div>
            <div class="offer-sender">Final agreed price</div>
          </div>
          <div class="chat-message" style="font-style: normal; color: var(--md-sys-color-on-surface);">
            Congratulations! You and your partner reached an agreement. Your payout will be displayed on the next page.
          </div>
        </div>
      `;
    } else {
      return html`
        <div class="transaction-item game-over rejected">
          <div class="transaction-header">
            <span class="transaction-turn">Game Over</span>
            <span class="transaction-status rejected">✗ No Deal</span>
          </div>
          <div class="chat-message" style="font-style: normal; color: var(--md-sys-color-on-surface);">
            The maximum number of turns was reached without agreement. Your payout will be displayed on the next page.
          </div>
        </div>
      `;
    }
  }

  private async handleSendOffer() {
    if (!this.stage || !this.answer) return;

    this.errorMessage = '';

    // Validate offer price
    if (!this.offerPrice || this.offerPrice <= 0) {
      this.errorMessage = 'Please enter a valid price greater than 0';
      return;
    }

    try {
      // Call backend function to send offer
      await this.participantService.sendParticipantBargainOffer(
        this.stage.id,
        this.offerPrice,
        this.offerMessage,
      );

      // Clear input fields
      this.offerPrice = 0;
      this.offerMessage = '';
    } catch (error) {
      console.error('Error sending offer:', error);
      this.errorMessage = 'Failed to send offer. Please try again.';
    }
  }

  private async handleSendResponse(accept: boolean) {
    if (!this.stage || !this.answer) return;

    this.errorMessage = '';

    try {
      // Call backend function to send response
      await this.participantService.sendParticipantBargainResponse(
        this.stage.id,
        accept,
        this.responseMessage,
      );

      // Clear input field
      this.responseMessage = '';
    } catch (error) {
      console.error('Error sending response:', error);
      this.errorMessage = 'Failed to send response. Please try again.';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'bargain-participant-view': BargainParticipantView;
  }
}
