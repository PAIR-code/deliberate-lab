import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';

import {
  canProceedWithMinCardsFlipped,
  createFlipCardStageParticipantAnswer,
  FlipAction,
  FlipCard,
  FlipCardStageConfig,
  FlipCardStageParticipantAnswer,
  getUniqueFlippedCardsCount,
  isStageComplete,
  shuffleWithSeed,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase/firestore';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';
import {convertMarkdownToHTML} from '../../shared/utils';

import {styles} from './flipcard_participant_view.scss';

/** FlipCard stage participant view */
@customElement('flipcard-participant-view')
export class FlipCardParticipantView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property({type: Object}) stage: FlipCardStageConfig | undefined = undefined;

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    const answer = this.getParticipantAnswer();
    const isComplete = isStageComplete(this.stage, answer);

    return html`
      <div class="stage-container">
        <stage-description .stage=${this.stage}></stage-description>

        <div class="cards-grid">
          ${this.getDisplayCards().map((card: FlipCard) =>
            this.renderCard(card, answer),
          )}
        </div>

        ${this.stage?.enableSelection
          ? html`
              <div class="actions">
                ${this.renderSelectionInfo(answer)}
                ${this.renderActionButtons(answer)}
              </div>
            `
          : nothing}
        <stage-footer
          .stage=${this.stage}
          .disabled=${!isComplete}
          .onNextClick=${this.saveAndProgress}
        >
          ${isComplete && this.stage.progress.showParticipantProgress
            ? html`<progress-stage-completed></progress-stage-completed>`
            : nothing}
        </stage-footer>
      </div>
    `;
  }

  private renderCard(card: FlipCard, answer: FlipCardStageParticipantAnswer) {
    const isFlipped = answer.flippedCardIds.includes(card.id);
    const isSelected = answer.selectedCardIds.includes(card.id);
    const isConfirmed = answer.confirmed;

    const cardClasses = {
      card: true,
      flipped: isFlipped,
      selected: isSelected,
      disabled: isConfirmed,
    };

    return html`
      <div class="card-container ${classMap(cardClasses)}">
        <div class="card-inner">
          <!-- Front of card -->
          <div class="card-front">
            <h3 class="card-title">${card.title}</h3>
            <div class="card-content">
              ${unsafeHTML(convertMarkdownToHTML(card.frontContent))}
            </div>
            <div class="card-buttons">
              <md-outlined-button
                @click=${() => this.flipCard(card.id, 'flip_to_back')}
                ?disabled=${isConfirmed}
              >
                Learn More
              </md-outlined-button>
              ${this.stage?.enableSelection
                ? html`
                    <md-filled-button
                      @click=${() => this.selectCard(card.id)}
                      ?disabled=${isConfirmed ||
                      !canProceedWithMinCardsFlipped(this.stage, answer)}
                    >
                      Select
                    </md-filled-button>
                  `
                : nothing}
            </div>
          </div>

          <!-- Back of card -->
          <div class="card-back">
            <h3 class="card-title">${card.title}</h3>
            <div class="card-content">
              ${unsafeHTML(convertMarkdownToHTML(card.backContent))}
            </div>
            <div class="card-buttons">
              <md-outlined-button
                @click=${() => this.flipCard(card.id, 'flip_to_front')}
                ?disabled=${isConfirmed}
              >
                Back
              </md-outlined-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSelectionInfo(answer: FlipCardStageParticipantAnswer) {
    if (!this.stage) return nothing;

    if (answer.selectedCardIds.length === 0) {
      return nothing;
    }

    const selectedCard = this.stage.cards.find((card) =>
      answer.selectedCardIds.includes(card.id),
    );
    if (!selectedCard) return nothing;

    return html`
      <div class="selection-info">
        <strong>Selected:</strong> ${selectedCard.title}
      </div>
    `;
  }

  private renderActionButtons(answer: FlipCardStageParticipantAnswer) {
    if (!this.stage) return nothing;
    if (answer.selectedCardIds.length === 0) {
      return nothing;
    }

    const canProceed = canProceedWithMinCardsFlipped(this.stage!, answer);

    return html`
      <div class="action-buttons">
        <md-filled-button
          ?disabled=${answer.confirmed || !canProceed}
          @click=${this.confirmSelection}
        >
          ${answer.confirmed ? 'Selection Confirmed' : 'Confirm Selection'}
        </md-filled-button>
      </div>
    `;
  }

  private flipCard(cardId: string, action: 'flip_to_back' | 'flip_to_front') {
    if (!this.stage) return;

    const answer = this.getParticipantAnswer();
    if (answer.confirmed) return;

    const flipAction: FlipAction = {
      cardId,
      action,
      timestamp: Timestamp.now(),
    };

    const updatedFlippedIds = [...answer.flippedCardIds];
    if (action === 'flip_to_back' && !updatedFlippedIds.includes(cardId)) {
      updatedFlippedIds.push(cardId);
    } else if (action === 'flip_to_front') {
      const index = updatedFlippedIds.indexOf(cardId);
      if (index > -1) {
        updatedFlippedIds.splice(index, 1);
      }
    }

    const updatedAnswer: FlipCardStageParticipantAnswer = {
      ...answer,
      flippedCardIds: updatedFlippedIds,
      flipHistory: [...answer.flipHistory, flipAction],
    };

    this.participantAnswerService.addAnswer(this.stage.id, updatedAnswer);
  }

  private selectCard(cardId: string) {
    if (!this.stage) return;

    const answer = this.getParticipantAnswer();
    if (answer.confirmed) return;

    let updatedSelectedIds: string[];
    if (this.stage.allowMultipleSelections) {
      updatedSelectedIds = answer.selectedCardIds.includes(cardId)
        ? answer.selectedCardIds.filter((id: string) => id !== cardId)
        : [...answer.selectedCardIds, cardId];
    } else {
      updatedSelectedIds = [cardId];
    }

    const updatedAnswer: FlipCardStageParticipantAnswer = {
      ...answer,
      selectedCardIds: updatedSelectedIds,
    };

    this.participantAnswerService.addAnswer(this.stage.id, updatedAnswer);
  }

  private async confirmSelection() {
    if (!this.stage) return;

    const answer = this.getParticipantAnswer();
    if (answer.selectedCardIds.length === 0) return;
    if (!canProceedWithMinCardsFlipped(this.stage, answer)) return;

    const updatedAnswer: FlipCardStageParticipantAnswer = {
      ...answer,
      confirmed: true,
      timestamp: Timestamp.now(),
    };

    this.participantAnswerService.addAnswer(this.stage.id, updatedAnswer);

    // Save to Firebase
    await this.participantAnswerService.saveFlipCardAnswers(this.stage.id);
  }

  private getDisplayCards(): FlipCard[] {
    if (!this.stage) return [];

    if (this.stage.shuffleCards) {
      const participantId = this.participantService.profile?.privateId || '';
      return shuffleWithSeed(this.stage.cards, participantId);
    }

    return this.stage.cards;
  }

  private saveAndProgress = async () => {
    if (!this.stage) return;

    await this.participantAnswerService.saveFlipCardAnswers(this.stage.id);
    await this.participantService.progressToNextStage();
  };

  private getParticipantAnswer(): FlipCardStageParticipantAnswer {
    if (!this.stage) return createFlipCardStageParticipantAnswer('');

    const existingAnswer =
      this.participantAnswerService.answerMap[this.stage.id];

    if (existingAnswer?.kind === 'flipcard') {
      return existingAnswer as FlipCardStageParticipantAnswer;
    }

    // Only create and add a new answer if one doesn't exist
    const newAnswer = createFlipCardStageParticipantAnswer(this.stage.id);
    this.participantAnswerService.addAnswer(this.stage.id, newAnswer);
    return this.participantAnswerService.answerMap[
      this.stage.id
    ] as FlipCardStageParticipantAnswer;
  }
}
