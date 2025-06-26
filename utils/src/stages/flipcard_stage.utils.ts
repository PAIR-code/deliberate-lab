import {
  FlipCardStageConfig,
  FlipCardStageParticipantAnswer,
  FlipCard,
  FlipAction,
} from './flipcard_stage';

/** FlipCard stage utility functions for frontend and backend operations. */

/**
 * Count unique cards that have been flipped to back at least once.
 */
export function getUniqueFlippedCardsCount(
  answer: FlipCardStageParticipantAnswer,
): number {
  const uniqueFlippedCards = new Set(
    answer.flipHistory
      .filter((action: FlipAction) => action.action === 'flip_to_back')
      .map((action: FlipAction) => action.cardId),
  );
  return uniqueFlippedCards.size;
}

/**
 * Check if participant can proceed based on minimum flips requirement.
 */
export function canProceedWithMinFlips(
  stage: FlipCardStageConfig,
  answer: FlipCardStageParticipantAnswer,
): boolean {
  if (stage.minFlipsRequired === 0) {
    return true;
  }
  return getUniqueFlippedCardsCount(answer) >= stage.minFlipsRequired;
}

/**
 * Check if the FlipCard stage is complete for a participant.
 */
export function isStageComplete(
  stage: FlipCardStageConfig,
  answer: FlipCardStageParticipantAnswer,
): boolean {
  if (stage.enableSelection) {
    return answer.confirmed && canProceedWithMinFlips(stage, answer);
  } else {
    return canProceedWithMinFlips(stage, answer);
  }
}

/**
 * Validate that a card ID exists in the stage configuration.
 */
export function isValidCardId(
  stage: FlipCardStageConfig,
  cardId: string,
): boolean {
  return stage.cards.some((card) => card.id === cardId);
}

/**
 * Check if a participant can select additional cards.
 */
export function canSelectCard(
  stage: FlipCardStageConfig,
  answer: FlipCardStageParticipantAnswer,
  cardId: string,
): boolean {
  // Can't select if already confirmed
  if (answer.confirmed) {
    return false;
  }

  // Can't select if selection is disabled
  if (!stage.enableSelection) {
    return false;
  }

  // Can't select invalid card
  if (!isValidCardId(stage, cardId)) {
    return false;
  }

  // If multiple selections not allowed, can only select if none selected yet
  if (!stage.allowMultipleSelections && answer.selectedCardIds.length > 0) {
    // Unless deselecting the currently selected card
    return answer.selectedCardIds.includes(cardId);
  }

  return true;
}

/**
 * Check if participant meets minimum flips requirement to proceed.
 */
export function meetsMinFlipsRequirement(
  stage: FlipCardStageConfig,
  answer: FlipCardStageParticipantAnswer,
): boolean {
  return canProceedWithMinFlips(stage, answer);
}
