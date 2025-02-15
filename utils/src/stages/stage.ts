import {
  ChatStageConfig,
  ChatStageParticipantAnswer,
  ChatStagePublicData,
  createChatStagePublicData,
} from './chat_stage';
import {
  ChipStageConfig,
  ChipStageParticipantAnswer,
  ChipStagePublicData,
  createChipStagePublicData,
} from './chip_stage';
import {
  ComprehensionStageConfig,
  ComprehensionStageParticipantAnswer,
} from './comprehension_stage';
import {
  RankingStageConfig,
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  createRankingStagePublicData,
} from './ranking_stage';
import {InfoStageConfig} from './info_stage';
import {PayoutStageConfig, PayoutStageParticipantAnswer} from './payout_stage';
import {ProfileStageConfig} from './profile_stage';
import {RevealStageConfig} from './reveal_stage';
import {
  SalespersonStageConfig,
  SalespersonStagePublicData,
  createSalespersonStagePublicData,
} from './salesperson_stage';
import {
  SurveyPerParticipantStageConfig,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  createSurveyStagePublicData,
} from './survey_stage';
import {TOSStageConfig} from './tos_stage';
import {TransferStageConfig} from './transfer_stage';

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
  CHIP = 'chip', // "chip" negotiation
  COMPREHENSION = 'comprehension',
  RANKING = 'ranking',
  PAYOUT = 'payout',
  REVEAL = 'reveal',
  SALESPERSON = 'salesperson', // co-op traveling salesperson game
  SURVEY = 'survey',
  SURVEY_PER_PARTICIPANT = 'surveyPerParticipant',
  TRANSFER = 'transfer',
}

/** Specific game associated with stage. */
export enum StageGame {
  NONE = 'none',
  LAS = 'las', // Lost at Sea
  RTV = 'rtv', // Reality TV Debate.
  CHP = 'chp', // Chip Negotiation
  CTS = 'cts', // Co-op Traveling Salesperson
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
  | ChipStageConfig
  | ComprehensionStageConfig
  | RankingStageConfig
  | InfoStageConfig
  | PayoutStageConfig
  | ProfileStageConfig
  | RevealStageConfig
  | SalespersonStageConfig
  | SurveyStageConfig
  | SurveyPerParticipantStageConfig
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
  | ChipStageParticipantAnswer
  | ComprehensionStageParticipantAnswer
  | PayoutStageParticipantAnswer
  | RankingStageParticipantAnswer
  | SurveyStageParticipantAnswer
  | SurveyPerParticipantStageParticipantAnswer;

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
  | ChipStagePublicData
  | RankingStagePublicData
  | SalespersonStagePublicData
  | SurveyStagePublicData;

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create stage text config. */
export function createStageTextConfig(
  config: Partial<StageTextConfig> = {},
): StageTextConfig {
  return {
    primaryText: config.primaryText ?? '',
    infoText: config.infoText ?? '',
    helpText: config.helpText ?? '',
  };
}

/** Create stage progress config. */
export function createStageProgressConfig(
  config: Partial<StageProgressConfig> = {},
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
      case StageKind.CHIP:
        publicData.push(createChipStagePublicData(stage.id));
        break;
      case StageKind.RANKING:
        publicData.push(createRankingStagePublicData(stage.id));
        break;
      case StageKind.SALESPERSON:
        publicData.push(
          createSalespersonStagePublicData(stage.id, stage.board.startCoord),
        );
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
