import {AgentMediatorTemplate, AgentParticipantTemplate} from './agent';
import {
  MetadataConfig,
  PermissionsConfig,
  createMetadataConfig,
  createPermissionsConfig,
  generateId,
} from './shared';
import {StageConfig} from './stages/stage';
import {VariableConfig} from './variables';

/** Experiment types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Increment this ID when Firestore objects are updated in a way that
 * impacts loading previous versions of those objects on the frontend
 * (e.g., new field is added to existing stage config).
 *
 * VERSION 5 - updated in PR #334 to add completedWaiting map
 *             to participant progress timestamps
 * VERSION 6 - updated in PR #337 to remove attention check config
 * VERSION 7 - updated in PR #348 to store additional chip negotiation data
 * VERSION 8 - updated in PR #372; MediatorConfig is now AgentConfig
 * VERSION 9 - updated in PR #373 to add avatar (emoji) field to ChipItem
 *             and rename chip quantity field to startingQuantity
 * VERSION 10 - add baseCurrencyAmount to PayoutItemResult (PR #384)
 * VERSION 11 - add anonymous profile map to ParticipantProfile (PR #391)
 * VERSION 12 - add cohortLockMap to Experiment (PR #402)
 * VERSION 13 - add randomSelectionId to payout stage (PR #430)
 * VERSION 14 - add currentDiscussionId to chat public data (PR #431)
 * VERSION 15 - add stageUnlockMap, readyStages timestamps (PR #442)
 * VERSION 16 - switch to new mediator workflow including updated ChatMessage
 * VERSION 17 - add structured output config to agent prompt configs
 * VERSION 18 - add agent participant config to ParticipantProfileExtended
 * VERSION 19 - Support for Variables including objects and arrays
 */
export const EXPERIMENT_VERSION_ID = 19;

/** Experiment. */
export interface Experiment {
  id: string;
  // Track current version for backwards compatibility
  versionId: number;
  metadata: MetadataConfig;
  permissions: PermissionsConfig;
  defaultCohortConfig: CohortParticipantConfig; // used by default for cohorts
  prolificConfig: ProlificConfig;
  stageIds: string[]; // Ordered list of stage IDs
  cohortLockMap: Record<string, boolean>; // maps cohort ID to is locked
  variableConfigs?: VariableConfig[]; // list of variable configs used in experiment
  variableMap?: Record<string, string>; // variable to assigned value
}

/** Experiment template (used to load experiments). */
export interface ExperimentTemplate {
  id: string; // template ID
  // Used to extract metadata, prolific config, etc.
  // WARNING: Not used to for stage ID ordering (instead, see stageConfigs)
  experiment: Experiment;
  stageConfigs: StageConfig[];
  agentMediators: AgentMediatorTemplate[];
  agentParticipants: AgentParticipantTemplate[];
}

/** Experiment config for participant options. */
export interface CohortParticipantConfig {
  // Min number of participants required for experiment cohort to begin
  // (or null if no requirement)
  minParticipantsPerCohort: number | null;
  // Max number of participants for experiment cohort (or null if no limit)
  maxParticipantsPerCohort: number | null;
  // If false, exclude booted participant from min/max participant counts
  includeAllParticipantsInCohortCount: boolean;
  // If true, disable pasting in chat input to prevent bot-like behavior
  botProtection: boolean;
}

/** Prolific integration config. */
export interface ProlificConfig {
  enableProlificIntegration: boolean;
  defaultRedirectCode: string;
  attentionFailRedirectCode: string;
  bootedRedirectCode: string;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create experiment. */
export function createExperimentConfig(
  stages: StageConfig[] = [],
  config: Partial<Experiment> = {},
): Experiment {
  return {
    id: config.id || generateId(),
    versionId: EXPERIMENT_VERSION_ID,
    metadata: config.metadata ?? createMetadataConfig(),
    permissions: config.permissions ?? createPermissionsConfig(),
    defaultCohortConfig: createCohortParticipantConfig(
      config.defaultCohortConfig,
    ),
    prolificConfig: config.prolificConfig ?? createProlificConfig(),
    stageIds: stages.map((stage) => stage.id),
    cohortLockMap: config.cohortLockMap ?? {},
    variableConfigs: config.variableConfigs ?? [],
    variableMap: config.variableMap ?? {},
  };
}

/** Create experiment template. */
export function createExperimentTemplate(
  config: Partial<ExperimentTemplate>,
): ExperimentTemplate {
  return {
    id: config.id || generateId(),
    experiment: config.experiment ?? createExperimentConfig(),
    stageConfigs: config.stageConfigs ?? [],
    agentMediators: config.agentMediators ?? [],
    agentParticipants: config.agentParticipants ?? [],
  };
}

/** Create CohortParticipantConfig. */
export function createCohortParticipantConfig(
  config: Partial<CohortParticipantConfig> = {},
): CohortParticipantConfig {
  return {
    minParticipantsPerCohort: config.minParticipantsPerCohort ?? null,
    maxParticipantsPerCohort: config.maxParticipantsPerCohort ?? null,
    includeAllParticipantsInCohortCount:
      config.includeAllParticipantsInCohortCount ?? false,
    botProtection: config.botProtection ?? false,
  };
}

/** Create ProlificConfig. */
export function createProlificConfig(
  config: Partial<ProlificConfig> = {},
): ProlificConfig {
  return {
    enableProlificIntegration: config.enableProlificIntegration ?? false,
    defaultRedirectCode: config.defaultRedirectCode ?? '',
    attentionFailRedirectCode: config.attentionFailRedirectCode ?? '',
    bootedRedirectCode: config.bootedRedirectCode ?? '',
  };
}
