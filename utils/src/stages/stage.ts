import {
  ChatStageConfig,
  ChatStageParticipantAnswer,
  ChatStagePublicData,
  createChatStagePublicData,
} from './chat_stage';
import {
  ItemElectionStage,
  ParticipantElectionStage,
  ElectionStageConfig,
  ElectionStageParticipantAnswer,
  ElectionStagePublicData,
  createElectionStagePublicData,
} from './election_stage';
import { InfoStageConfig } from './info_stage';
import { PayoutStageConfig } from './payout_stage';
import { ProfileStageConfig } from './profile_stage';
import { RevealStageConfig } from './reveal_stage';
import {
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  createSurveyStagePublicData,
} from './survey_stage';
import { TOSStageConfig } from './tos_stage';
import { TransferStageConfig } from './transfer_stage';

/** Base stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Types of stages. */
export enum StageKind {
  // General stages
  INFO = 'info',
  TOS = 'tos', // terms of service
  PROFILE = 'profile', // set profile
  CHAT = 'chat', // group chat
  ELECTION = 'election',
  PAYOUT = 'payout',
  REVEAL = 'reveal',
  SURVEY = 'survey',
  TRANSFER = 'transfer'
}

/** Specific game associated with stage. */
export enum StageGame {
  NONE = 'none',
  LAS = 'las', // Lost at Sea
  GCE = 'gce', // Gift Card Exchange
}

/**
 * Base stage config.
 *
 * StageConfigs are stored as a doc (with the stage ID as doc ID)
 * under experiments/{experimentId}/stages in Firestore.
 */
export interface BaseStageConfig {
  id: string;
  kind: StageKind;
  game: StageGame;
  name: string;
  descriptions: StageTextConfig;
  progress: StageProgressConfig;
}

export interface StageTextConfig {
  primaryText: string; // shown at top of screen under header
  infoText: string; // for info popup
  helpText: string; // for help popup
}

export interface StageProgressConfig {
  minParticipants: number; // min participants required for stage
  waitForAllParticipants: boolean; // wait for all participants to reach stage
  showParticipantProgress: boolean; // show participants who completed stage
}

export type StageConfig =
  | ChatStageConfig
  | ItemElectionStage
  | ParticipantElectionStage
  | InfoStageConfig
  | PayoutStageConfig
  | ProfileStageConfig
  | RevealStageConfig
  | SurveyStageConfig
  | TOSStageConfig
  | TransferStageConfig;

/**
 * Base stage answer created from participant input.
 *
 * StageParticipantAnswer is stored as a doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 * in Firestore.
 */
export interface BaseStageParticipantAnswer {
  id: string; // should match stage ID
  kind: StageKind;
}

export type StageParticipantAnswer =
 | ChatStageParticipantAnswer
 | ElectionStageParticipantAnswer
 | SurveyStageParticipantAnswer;

/**
 * Base stage public data created from cloud triggers
 * and associated with specific cohort.
 *
 * StagePublicData is stored as a doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData/
 * in Firestore.
 */
export interface BaseStagePublicData {
  id: string; // should match stage ID
  kind: StageKind;
}

export type StagePublicData =
  | ChatStagePublicData
  | ElectionStagePublicData
  | SurveyStagePublicData;

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create stage text config. */
export function createStageTextConfig(
  config: Partial<StageTextConfig> = {}
): StageTextConfig {
  return {
    primaryText: config.primaryText ?? '',
    infoText: config.infoText ?? '',
    helpText: config.helpText ?? '',
  };
}

/** Create stage progress config. */
export function createStageProgressConfig(
  config: Partial<StageProgressConfig> = {}
): StageProgressConfig {
  return {
    minParticipants: config.minParticipants ?? 0,
    waitForAllParticipants: config.waitForAllParticipants ?? false,
    showParticipantProgress: config.showParticipantProgress ?? true,
  };
}

/** Find index of specific stage kind. */
export function findStageKind(stages: StageConfig[], kind: StageKind) {
  return stages.findIndex((stage) => stage.kind === kind);
}

/** Given list of StageConfigs, return list of initialized PublicData. */
export function createPublicDataFromStageConfigs(stages: StageConfig[]) {
  const publicData: StagePublicData[] = [];
  stages.forEach((stage) => {
    switch (stage.kind) {
      case StageKind.CHAT:
        publicData.push(createChatStagePublicData(stage));
        break;
      case StageKind.ELECTION:
        publicData.push(createElectionStagePublicData(stage.id));
        break;
      case StageKind.SURVEY:
        publicData.push(createSurveyStagePublicData(stage.id));
        break;
      default:
        break;
    }
  });
  return publicData;
}