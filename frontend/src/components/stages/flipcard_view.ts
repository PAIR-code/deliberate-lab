import '../progress/progress_stage_completed';
import './stage_description';
import './stage_footer';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';

import {MobxLitElement} from '@adobe/lit-mobx';
import {CSSResultGroup, html, nothing} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

import {
  FlipCardStageConfig,
  FlipCard,
  FlipCardStageParticipantAnswer,
  createFlipCardStageParticipantAnswer,
  FlipAction,
} from '@deliberation-lab/utils';

import {core} from '../../core/core';
import {ParticipantService} from '../../services/participant.service';
import {ParticipantAnswerService} from '../../services/participant.answer';

import {styles} from './flipcard_view.scss';

/** FlipCard stage view for participants */
@customElement('flipcard-view')
export class FlipCardView extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly participantService = core.getService(ParticipantService);
  private readonly participantAnswerService = core.getService(
    ParticipantAnswerService,
  );

  @property({type: Object}) stage!: FlipCardStageConfig;

  override render() {
    if (!this.stage || !this.participantService.profile) {
      return nothing;
    }

    const answer = this.getParticipantAnswer();
    const isComplete = answer.confirmed;

    return html`
      <div class="stage-container">
        <stage-description .stage=${this.stage}></stage-description>

        <div class="cards-grid">
          ${this.stage.cards.map((card) => this.renderCard(card, answer))}
        </div>

        ${this.stage.enableSelection
          ? html`
              <div class="actions">
                ${this.renderSelectionInfo(answer)}
                ${this.renderActionButtons(answer)}
              </div>
            `
          : nothing}
        ${isComplete
          ? html`<progress-stage-completed></progress-stage-completed>`
          : nothing}
        <stage-footer .stage=${this.stage}></stage-footer>
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
            <div class="card-content">${card.frontContent}</div>
            <div class="card-buttons">
              <md-text-button
                @click=${() => this.flipCard(card.id, 'flip_to_back')}
                ?disabled=${isConfirmed}
              >
                Learn More
              </md-text-button>
              ${this.stage.enableSelection
                ? html`
                    <md-filled-button
                      @click=${() => this.selectCard(card.id)}
                      ?disabled=${isConfirmed}
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
            <div class="card-content">${card.backContent}</div>
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
    if (answer.confirmed) {
      return html`
        <div class="action-buttons">
          <md-filled-button disabled>Selection Confirmed</md-filled-button>
        </div>
      `;
    }

    if (answer.selectedCardIds.length === 0) {
      return nothing;
    }

    return html`
      <div class="action-buttons">
        <md-filled-button @click=${this.confirmSelection}>
          Confirm Selection
        </md-filled-button>
      </div>
    `;
  }

  private flipCard(cardId: string, action: 'flip_to_back' | 'flip_to_front') {
    const answer = this.getParticipantAnswer();
    if (answer.confirmed) return;

    const flipAction: FlipAction = {
      cardId,
      action,
      timestamp: new Date().toISOString(),
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
    const answer = this.getParticipantAnswer();
    if (answer.confirmed) return;

    let updatedSelectedIds: string[];
    if (this.stage.allowMultipleSelections) {
      updatedSelectedIds = answer.selectedCardIds.includes(cardId)
        ? answer.selectedCardIds.filter((id) => id !== cardId)
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
    const answer = this.getParticipantAnswer();
    if (answer.selectedCardIds.length === 0) return;

    const updatedAnswer: FlipCardStageParticipantAnswer = {
      ...answer,
      confirmed: true,
      timestamp: new Date().toISOString(),
    };

    this.participantAnswerService.addAnswer(this.stage.id, updatedAnswer);

    // Save to Firebase
    await this.participantAnswerService.saveFlipCardAnswers(this.stage.id);
  }

  private getParticipantAnswer(): FlipCardStageParticipantAnswer {
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
