import {ChatMessage} from '../chat_message';
import {ParticipantProfileExtended} from '../participant';
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
  FlipCardStageConfig,
  FlipCardStageParticipantAnswer,
  FlipCardStagePublicData,
  createFlipCardStagePublicData,
} from './flipcard_stage';
import {
  RankingStageConfig,
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  createRankingStagePublicData,
} from './ranking_stage';
import {InfoStageConfig} from './info_stage';
import {PayoutStageConfig, PayoutStageParticipantAnswer} from './payout_stage';
import {PrivateChatStageConfig} from './private_chat_stage';
import {ProfileStageConfig} from './profile_stage';
import {RevealStageConfig} from './reveal_stage';
import {
  RoleStageConfig,
  RoleStagePublicData,
  createRoleStagePublicData,
} from './role_stage';
import {
  SalespersonStageConfig,
  SalespersonStagePublicData,
  createSalespersonStagePublicData,
} from './salesperson_stage';
import {
  StockInfoStageConfig,
  StockInfoStageParticipantAnswer,
} from './stockinfo_stage';
import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
  AssetAllocationStagePublicData,
  MultiAssetAllocationStageConfig,
  MultiAssetAllocationStageParticipantAnswer,
  MultiAssetAllocationStagePublicData,
  createMultiAssetAllocationStagePublicData,
  createAssetAllocationStagePublicData,
} from './asset_allocation_stage';
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
  FLIPCARD = 'flipcard', // flip card selection
  RANKING = 'ranking',
  PAYOUT = 'payout',
  PRIVATE_CHAT = 'privateChat', // participant plus any mediators
  REVEAL = 'reveal',
  SALESPERSON = 'salesperson', // co-op traveling salesperson game
  STOCKINFO = 'stockinfo',
  ASSET_ALLOCATION = 'assetAllocation', // asset allocation between 2 stocks
  MULTI_ASSET_ALLOCATION = 'multiAssetAllocation', // allocation of 2+ stocks
  ROLE = 'role', // info stage that assigns different roles to participants
  SURVEY = 'survey',
  SURVEY_PER_PARTICIPANT = 'surveyPerParticipant',
  TRANSFER = 'transfer',
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
  | FlipCardStageConfig
  | RankingStageConfig
  | InfoStageConfig
  | PayoutStageConfig
  | PrivateChatStageConfig
  | ProfileStageConfig
  | RevealStageConfig
  | SalespersonStageConfig
  | StockInfoStageConfig
  | AssetAllocationStageConfig
  | MultiAssetAllocationStageConfig
  | RoleStageConfig
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
  | AssetAllocationStageParticipantAnswer
  | MultiAssetAllocationStageParticipantAnswer
  | ChatStageParticipantAnswer
  | ChipStageParticipantAnswer
  | ComprehensionStageParticipantAnswer
  | FlipCardStageParticipantAnswer
  | PayoutStageParticipantAnswer
  | RankingStageParticipantAnswer
  | StockInfoStageParticipantAnswer
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
  | FlipCardStagePublicData
  | RankingStagePublicData
  | RoleStagePublicData
  | SalespersonStagePublicData
  | AssetAllocationStagePublicData
  | MultiAssetAllocationStagePublicData
  | SurveyStagePublicData;

/** Stage context data (used for assembling prompts). */
export interface StageContextData {
  stage: StageConfig;
  participants: ParticipantProfileExtended[]; // all active cohort participants
  privateAnswers: Array<{
    participantPublicId: string;
    participantDisplayName: string;
    answer: StageParticipantAnswer;
  }>;
  privateChatMap: Record<string, ChatMessage[]>;
  publicChatMessages: ChatMessage[];
  publicData: StagePublicData | undefined;
}

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
      case StageKind.FLIPCARD:
        publicData.push(createFlipCardStagePublicData(stage.id));
        break;
      case StageKind.RANKING:
        publicData.push(createRankingStagePublicData(stage.id));
        break;
      case StageKind.ROLE:
        publicData.push(createRoleStagePublicData(stage));
        break;
      case StageKind.SALESPERSON:
        publicData.push(
          createSalespersonStagePublicData(stage.id, stage.board.startCoord),
        );
        break;
      case StageKind.SURVEY:
        publicData.push(createSurveyStagePublicData(stage.id));
        break;
      case StageKind.ASSET_ALLOCATION:
        publicData.push(createAssetAllocationStagePublicData({id: stage.id}));
        break;
      case StageKind.MULTI_ASSET_ALLOCATION:
        publicData.push(
          createMultiAssetAllocationStagePublicData({id: stage.id}),
        );
        break;
      default:
        break;
    }
  });
  return publicData;
}

/** Initializes StageContext object with just stage config. */
export function initializeStageContextData(
  stage: StageConfig,
): StageContextData {
  return {
    stage,
    participants: [],
    privateAnswers: [],
    privateChatMap: {},
    publicChatMessages: [],
    publicData: undefined,
  };
}
