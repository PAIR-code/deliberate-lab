import { ChatStageConfig } from './chat_stage';
import {
  ElectionStageConfig,
  ElectionStageParticipantAnswer,
  ElectionStagePublicData,
  createElectionStagePublicData,
} from './election_stage';
import { InfoStageConfig } from './info_stage';
import { ProfileStageConfig } from './profile_stage';
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
  TRANSFER = 'transfer',
  WTL_SURVEY = 'wtlSurvey', // willingness to lead survey

  // Lost at Sea (LAS) game specific stages
  LAS_CHAT = 'lasChat',
  LAS_SURVEY = 'lasSurvey',
}

/** Specific game associated with stage. */
export enum StageGame {
  NONE = 'none',
  LAS = 'las', // Lost at Sea
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
}

export interface StageTextConfig {
  primaryText: string; // shown at top of screen under header
  infoText: string; // for info popup
  helpText: string; // for help popup
}

export type StageConfig =
  | ChatStageConfig
  | ElectionStageConfig
  | InfoStageConfig
  | ProfileStageConfig
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

/** Find index of specific stage kind. */
export function findStageKind(stages: StageConfig[], kind: StageKind) {
  return stages.findIndex((stage) => stage.kind === kind);
}

/** Given list of StageConfigs, return list of initialized PublicData. */
export function createPublicDataFromStageConfigs(stages: StageConfig[]) {
  const publicData: StagePublicData[] = [];
  stages.forEach((stage) => {
    switch (stage.kind) {
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