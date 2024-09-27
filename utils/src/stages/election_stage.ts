import { generateId } from '../shared';
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
 * ElectionStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export enum ElectionStrategy {
  NONE = 'none', // Not an election.
  CONDORCET = 'condorcet', // Condorcet resolution.
}

export enum ElectionType {
  ITEMS = 'items', // Item ranking.
  PARTICIPANTS = 'participants', // Participant ranking.
}

export interface BaseElectionStage extends BaseStageConfig {
  kind: StageKind.ELECTION;
  electionType: ElectionType;
  strategy: ElectionStrategy;
}

export interface ParticipantElectionStage extends BaseElectionStage {
  electionType: ElectionType.PARTICIPANTS;
  enableSelfVoting: boolean; // Whether to allow voting for oneself.
}

export interface ElectionItem {
  id: string;
  imageId: string; // or empty if no image provided
  text: string;
}

export interface ItemElectionStage extends BaseElectionStage {
  electionType: ElectionType.ITEMS;
  electionItems: ElectionItem[];
}

export type ElectionStageConfig = ParticipantElectionStage | ItemElectionStage;

/**
 * ElectionStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface ElectionStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.ELECTION;
  // ordered answer list of either participant IDs or election item IDs
  rankingList: string[];
}

/**
 * ElectionStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface ElectionStagePublicData extends BaseStagePublicData {
  kind: StageKind.ELECTION;
  // Strategy
  strategy: ElectionStrategy;
  // ID of current winner based on participant rankings
  currentWinner: string;
  // Maps from participant to participant's rankings (question ID to answer)
  participantAnswerMap: Record<string, string[]>;
  electionItems: ElectionItem[];
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createElectionStage(
  config: Partial<ElectionStageConfig> = {},
): ElectionStageConfig {
  const baseStageConfig = {
    id: config.id ?? generateId(),
    kind: StageKind.ELECTION,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Election',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig({ waitForAllParticipants: true }),
    strategy: config.strategy ?? ElectionStrategy.CONDORCET,
  };

  config.electionType = config.electionType ?? ElectionType.PARTICIPANTS;
  if (config.electionType === ElectionType.ITEMS) {
    return {
      ...baseStageConfig,
      electionType: ElectionType.ITEMS,
      electionItems: config.electionItems ?? [],
    } as ItemElectionStage; // Assert as ItemElectionStage
  } else if (config.electionType === ElectionType.PARTICIPANTS) {
    return {
      ...baseStageConfig,
      electionType: ElectionType.PARTICIPANTS,
      enableSelfVoting: config.enableSelfVoting ?? false,
    } as ParticipantElectionStage; // Assert as ParticipantElectionStage
  } else {
    throw new Error('Invalid electionType specified in the configuration.');
  }
}

/** Create election item. */
export function createElectionItem(config: Partial<ElectionItem> = {}): ElectionItem {
  return {
    id: config.id ?? generateId(),
    imageId: config.imageId ?? '',
    text: config.text ?? '',
  };
}

/** Create election stage public data. */
export function createElectionStagePublicData(
  id: string, // stage ID
): ElectionStagePublicData {
  return {
    id,
    kind: StageKind.ELECTION,
    strategy: ElectionStrategy.NONE,
    currentWinner: '',
    participantAnswerMap: {},
    electionItems: [],
  };
}
