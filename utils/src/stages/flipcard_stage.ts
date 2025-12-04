import {Timestamp} from 'firebase/firestore';
import {generateId, UnifiedTimestamp} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** FlipCard item configuration. */
export interface FlipCard {
  id: string;
  title: string;
  frontContent: string;
  backContent: string;
}

/** FlipCard stage config. */
export interface FlipCardStageConfig extends BaseStageConfig {
  kind: StageKind.FLIPCARD;
  cards: FlipCard[];
  enableSelection: boolean;
  allowMultipleSelections: boolean;
  requireConfirmation: boolean;
  minUniqueCardsFlippedRequirement: number;
  shuffleCards: boolean;
}

/** FlipCard participant answer. */
export interface FlipCardStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.FLIPCARD;
  selectedCardIds: string[];
  flippedCardIds: string[];
  flipHistory: FlipAction[];
  confirmed: boolean;
  timestamp: UnifiedTimestamp;
}

/** FlipCard public data. */
export interface FlipCardStagePublicData extends BaseStagePublicData {
  kind: StageKind.FLIPCARD;
  /** Map of participant public IDs to their flip action history */
  participantFlipHistory: Record<string, FlipAction[]>;
  /** Map of participant public IDs to their selected card IDs */
  participantSelections: Record<string, string[]>;
}

/** Flip action tracking. */
export interface FlipAction {
  cardId: string;
  action: 'flip_to_back' | 'flip_to_front';
  timestamp: UnifiedTimestamp;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create FlipCard item. */
export function createFlipCard(config: Partial<FlipCard> = {}): FlipCard {
  return {
    id: config.id ?? generateId(),
    title: config.title ?? '',
    frontContent: config.frontContent ?? '',
    backContent: config.backContent ?? '',
  };
}

/** Create FlipCard stage. */
export function createFlipCardStage(
  config: Partial<FlipCardStageConfig> = {},
): FlipCardStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.FLIPCARD,
    name: config.name ?? 'FlipCard',
    descriptions:
      config.descriptions ??
      createStageTextConfig({
        primaryText: 'Browse the cards and select one that interests you.',
        infoText:
          'Click "Learn More" to flip a card and see additional information. Select a card and confirm your choice to proceed.',
        helpText:
          'Use the "Learn More" button to view the back of cards. Once you find a card you like, click "Select" and then "Confirm Selection" to continue.',
      }),
    progress:
      config.progress ??
      createStageProgressConfig({
        minParticipants: 1,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      }),
    cards: config.cards ?? [createFlipCard()],
    enableSelection: config.enableSelection ?? true,
    allowMultipleSelections: config.allowMultipleSelections ?? false,
    requireConfirmation: config.requireConfirmation ?? true,
    minUniqueCardsFlippedRequirement:
      config.minUniqueCardsFlippedRequirement ?? 0,
    shuffleCards: config.shuffleCards ?? false,
  };
}

/** Create FlipCard stage participant answer. */
export function createFlipCardStageParticipantAnswer(
  stageId: string,
  config: Partial<FlipCardStageParticipantAnswer> = {},
): FlipCardStageParticipantAnswer {
  return {
    id: stageId,
    kind: StageKind.FLIPCARD,
    selectedCardIds: config.selectedCardIds ?? [],
    flippedCardIds: config.flippedCardIds ?? [],
    flipHistory: config.flipHistory ?? [],
    confirmed: config.confirmed ?? false,
    timestamp: config.timestamp ?? Timestamp.now(),
  };
}

/** Create FlipCard stage public data. */
export function createFlipCardStagePublicData(
  stageId: string,
  config: Partial<FlipCardStagePublicData> = {},
): FlipCardStagePublicData {
  return {
    id: stageId,
    kind: StageKind.FLIPCARD,
    participantFlipHistory: config.participantFlipHistory ?? {},
    participantSelections: config.participantSelections ?? {},
  };
}
