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
import {Condition} from '../utils/condition';

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
  | SurveyAutoTransferConfig
  | ConditionAutoTransferConfig;

export enum AutoTransferType {
  DEFAULT = 'default', // group only based on number of participants
  SURVEY = 'survey', // match based on responses to specific survey question (multiple choice only)
  CONDITION = 'condition', // flexible condition-based routing using the Condition system
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
  type: AutoTransferType.SURVEY;
  // ID of the survey stage to reference
  surveyStageId: string;
  // ID of the survey question to reference
  surveyQuestionId: string;
  // Map of serialized survey answers to required participant counts
  participantCounts: {[key: string]: number};
}

/**
 * A transfer group defines a set of participants matched by a condition.
 * Participants are evaluated against groups in order and assigned to the
 * first matching group.
 */
export interface TransferGroup {
  id: string;
  name: string; // Human-readable name for the group (e.g., "Pro-Agent Cohort")
  condition: Condition; // Condition that must be met to join this group
  minParticipants: number; // Minimum participants needed before transfer
  maxParticipants: number; // Maximum participants per cohort
  // If set, route to existing cohort instead of creating a new one
  targetCohortAlias?: string;
}

/**
 * Condition-based auto-transfer config.
 * Uses the Condition system for flexible routing based on any survey question type
 * (scale, multiple choice, text, etc.) with rich comparison operators.
 *
 * Participants are evaluated against transfer groups in order and assigned to
 * the first group whose condition matches. When a group reaches its minParticipants,
 * those participants are transferred to a new cohort.
 */
export interface ConditionAutoTransferConfig extends BaseAutoTransferConfig {
  type: AutoTransferType.CONDITION;
  // Transfer groups evaluated in order - participant joins first matching group
  transferGroups: TransferGroup[];
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

/** Create a transfer group for condition-based transfers. */
export function createTransferGroup(
  config: Partial<TransferGroup> & {condition: Condition},
): TransferGroup {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Transfer Group',
    condition: config.condition,
    minParticipants: config.minParticipants ?? 1,
    maxParticipants: config.maxParticipants ?? 1,
    targetCohortAlias: config.targetCohortAlias,
  };
}

/** Create condition-based auto-transfer config. */
export function createConditionAutoTransferConfig(
  config: Partial<ConditionAutoTransferConfig> & {
    transferGroups: TransferGroup[];
  },
): ConditionAutoTransferConfig {
  return {
    type: AutoTransferType.CONDITION,
    autoCohortParticipantConfig:
      config.autoCohortParticipantConfig ?? createCohortParticipantConfig(),
    transferGroups: config.transferGroups,
  };
}
