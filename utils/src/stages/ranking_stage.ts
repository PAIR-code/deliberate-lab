import {generateId} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

/** Election stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * RankingStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export enum ElectionStrategy {
  NONE = 'none', // Not an election.
  CONDORCET = 'condorcet', // Condorcet resolution.
}

export enum RankingType {
  ITEMS = 'items', // Item ranking.
  PARTICIPANTS = 'participants', // Participant ranking.
}

export interface BaseRankingStage extends BaseStageConfig {
  kind: StageKind.RANKING;
  rankingType: RankingType;
  strategy: ElectionStrategy;
}

export interface ParticipantRankingStage extends BaseRankingStage {
  rankingType: RankingType.PARTICIPANTS;
  enableSelfVoting: boolean; // Whether to allow voting for oneself.
}

export interface RankingItem {
  id: string;
  imageId: string; // image URL, or empty if no image provided
  text: string;
}

export interface ItemRankingStage extends BaseRankingStage {
  rankingType: RankingType.ITEMS;
  rankingItems: RankingItem[];
}

export type RankingStageConfig = ParticipantRankingStage | ItemRankingStage;

/**
 * RankingStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface RankingStageParticipantAnswer
  extends BaseStageParticipantAnswer {
  kind: StageKind.RANKING;
  // ordered answer list of either participant IDs or ranking item IDs
  rankingList: string[];
}

/**
 * RankingStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface RankingStagePublicData extends BaseStagePublicData {
  kind: StageKind.RANKING;
  // ID of current winner based on participant rankings
  winnerId: string;
  // Maps from participant to participant's rankings (question ID to answer)
  participantAnswerMap: Record<string, string[]>;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createRankingStage(
  config: Partial<RankingStageConfig> = {},
): RankingStageConfig {
  const baseStageConfig = {
    id: config.id ?? generateId(),
    kind: StageKind.RANKING,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Ranking',
    descriptions: config.descriptions ?? createStageTextConfig({
      helpText: `Either drag and drop or use the arrows to rank all of the items.`
    }),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    strategy: config.strategy ?? ElectionStrategy.CONDORCET,
  };

  config.rankingType = config.rankingType ?? RankingType.PARTICIPANTS;
  if (config.rankingType === RankingType.ITEMS) {
    return {
      ...baseStageConfig,
      rankingType: RankingType.ITEMS,
      rankingItems: config.rankingItems ?? [],
    } as ItemRankingStage; // Assert as ItemRankingStage
  } else if (config.rankingType === RankingType.PARTICIPANTS) {
    return {
      ...baseStageConfig,
      rankingType: RankingType.PARTICIPANTS,
      enableSelfVoting: config.enableSelfVoting ?? false,
    } as ParticipantRankingStage; // Assert as ParticipantRankingStage
  } else {
    throw new Error('Invalid rankingType specified in the configuration.');
  }
}

/** Create item for ranking. */
export function createRankingItem(
  config: Partial<RankingItem> = {},
): RankingItem {
  return {
    id: config.id ?? generateId(),
    imageId: config.imageId ?? '',
    text: config.text ?? '',
  };
}

/** Create ranking stage particiapnt answer. */
export function createRankingStageParticipantAnswer(
  config: Partial<RankingStageParticipantAnswer> = {},
): RankingStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.RANKING,
    rankingList: config.rankingList ?? [],
  };
}

/** Create ranking stage public data. */
export function createRankingStagePublicData(
  id: string, // stage ID
): RankingStagePublicData {
  return {
    id,
    kind: StageKind.RANKING,
    winnerId: '',
    participantAnswerMap: {},
  };
}
