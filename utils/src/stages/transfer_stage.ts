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
 * A group composition entry defines criteria for selecting participants.
 * Multiple entries can be combined in a TransferGroup to form
 * mixed-composition cohorts (e.g., 2 pro-AI + 3 skeptic participants).
 */
export interface GroupComposition {
  id: string;
  condition: Condition; // Condition that must be met
  minCount: number; // Minimum participants needed with this condition
  maxCount: number; // Maximum participants to take with this condition
}

/**
 * A transfer group defines how to compose cohorts from participants.
 * Supports both single-condition groups and mixed-composition groups.
 *
 * Single-entry: One composition entry, all matching participants go together
 * Mixed-composition: Multiple composition entries, cohort needs participants from each
 *
 * A cohort is formed when ALL composition entries have met their minCount.
 */
export interface TransferGroup {
  id: string;
  name: string; // Human-readable name for the group (e.g., "Diverse Discussion Group")
  composition: GroupComposition[]; // Composition entries, cohort forms when all are satisfied
  // If set, route to existing cohort instead of creating a new one
  targetCohortAlias?: string;
}

/**
 * Condition-based auto-transfer config.
 * Uses the Condition system for flexible routing based on any survey question type
 * (scale, multiple choice, text, etc.) with rich comparison operators.
 *
 * Participants are evaluated against transfer groups in order and categorized
 * by the first composition entry they match. When all composition entries in a
 * group reach their minCount, those participants are transferred to a new cohort.
 */
export interface ConditionAutoTransferConfig extends BaseAutoTransferConfig {
  type: AutoTransferType.CONDITION;
  // Transfer groups evaluated in order - participant joins first matching group
  transferGroups: TransferGroup[];
  // When true, if multiple groups are ready for a participant, pick the group
  // whose target cohort has the fewest participants (balanced assignment).
  // When false (default), first matching ready group wins.
  enableGroupBalancing?: boolean;
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

/** Create a group composition entry for transfer groups. */
export function createGroupComposition(
  config: Partial<GroupComposition> & {condition: Condition},
): GroupComposition {
  const minCount = config.minCount ?? 1;
  const maxCount = config.maxCount ?? 1;

  if (minCount > maxCount) {
    throw new Error(
      `Invalid GroupComposition: minCount (${minCount}) cannot be greater than maxCount (${maxCount})`,
    );
  }

  return {
    id: config.id ?? generateId(),
    condition: config.condition,
    minCount,
    maxCount,
  };
}

/** Create a transfer group for condition-based transfers. */
export function createTransferGroup(
  config: Partial<TransferGroup> & {composition: GroupComposition[]},
): TransferGroup {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Transfer Group',
    composition: config.composition,
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
    enableGroupBalancing: config.enableGroupBalancing ?? false,
  };
}
