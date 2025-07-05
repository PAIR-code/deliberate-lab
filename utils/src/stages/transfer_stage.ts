import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';
import {
  CohortParticipantConfig,
  createCohortParticipantConfig,
} from '../experiment';

/** Transfer stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface TransferStageConfig extends BaseStageConfig {
  kind: StageKind.TRANSFER;
  enableTimeout: boolean;
  timeoutSeconds: number;
  autoTransferConfig: AutoTransferConfig | null; // if null, no auto-transfer
}

export type AutoTransferConfig =
  | DefaultAutoTransferConfig
  | SurveyAutoTransferConfig;

export enum AutoTransferType {
  DEFAULT = 'default', // group only based on number of participants
  SURVEY = 'survey', // match based on responses to specific survey question
}

export interface BaseAutoTransferConfig {
  type: AutoTransferType;
  // Cohort participant config for new cohorts
  autoCohortParticipantConfig: CohortParticipantConfig;
}

export interface DefaultAutoTransferConfig extends BaseAutoTransferConfig {
  type: AutoTransferType.DEFAULT;
  minParticipants: number;
  maxParticipants: number;
}

export interface SurveyAutoTransferConfig extends BaseAutoTransferConfig {
  // ID of the survey stage to reference
  surveyStageId: string;
  // ID of the survey question to reference
  surveyQuestionId: string;
  // Map of serialized survey answers to required participant counts
  participantCounts: {[key: string]: number};
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create transfer stage. */
export function createTransferStage(
  config: Partial<TransferStageConfig> = {},
): TransferStageConfig {
  const defaultText =
    'Please wait while we transfer you to the next stage of the experiment. Some latency may occur as we wait for additional participants.';
  return {
    id: config.id ?? generateId(),
    kind: StageKind.TRANSFER,
    name: config.name ?? 'Transfer',
    descriptions:
      config.descriptions ?? createStageTextConfig({primaryText: defaultText}),
    progress: config.progress ?? createStageProgressConfig(),
    enableTimeout: config.enableTimeout ?? false,
    timeoutSeconds: config.timeoutSeconds ?? 600, // 10 minutes
    autoTransferConfig: config.autoTransferConfig ?? null,
  };
}

/** Create survey auto-transfer config. */
export function createSurveyAutoTransferConfig(
  config: Partial<SurveyAutoTransferConfig> = {},
): SurveyAutoTransferConfig {
  return {
    type: AutoTransferType.SURVEY,
    autoCohortParticipantConfig:
      config.autoCohortParticipantConfig ?? createCohortParticipantConfig(),
    surveyStageId: config.surveyStageId ?? '',
    surveyQuestionId: config.surveyQuestionId ?? '',
    participantCounts: config.participantCounts ?? {},
  };
}
