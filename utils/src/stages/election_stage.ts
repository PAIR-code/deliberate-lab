import { generateId } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
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
export interface ElectionStageConfig extends BaseStageConfig {
  kind: StageKind.ELECTION;
  isParticipantElection: boolean; // use participants instead of election items
  electionItems: ElectionItem[]; // election items to rank
}

export interface ElectionItem {
  id: string;
  text: string;
}

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
  // ID of current winner based on participant rankings
  currentWinner: string;
  // Maps from participant to participant's rankings (question ID to answer)
  participantAnswerMap: Record<string, string[]>;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create election stage. */
export function createElectionStage(
  config: Partial<ElectionStageConfig> = {}
): ElectionStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.ELECTION,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Election',
    descriptions: config.descriptions ?? createStageTextConfig(),
    isParticipantElection: config.isParticipantElection ?? true,
    electionItems: config.electionItems ?? [],
  };
}

/** Create election stage public data. */
export function createElectionStagePublicData(
  id: string, // stage ID
): ElectionStagePublicData {
  return {
    id,
    kind: StageKind.ELECTION,
    currentWinner: '',
    participantAnswerMap: {},
  };
}