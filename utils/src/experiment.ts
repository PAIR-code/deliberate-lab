import {
  MetadataConfig,
  PermissionsConfig,
  createMetadataConfig,
  createPermissionsConfig,
  generateId
} from './shared';
import { StageConfig } from './stages/stage';

/** Experiment types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Increment this ID when Firestore objects are updated in a way that
  * impacts reading those objects on the frontend
  * (e.g., field is added to existing stage config).
  *
  * VERSION 3 - updated in PR #310
  */
export const EXPERIMENT_VERSION_ID = 3;

/** Experiment. */
export interface Experiment {
  id: string;
  // Track current version for backwards compatibility
  versionId: number;
  metadata: MetadataConfig;
  permissions: PermissionsConfig;  
  defaultCohortConfig: CohortParticipantConfig; // used by default for cohorts
  attentionCheckConfig: AttentionCheckConfig;
  prolificConfig: ProlificConfig;
  stageIds: string[]; // Ordered list of stage IDs
}

/** Experiment config for participant options. */
export interface CohortParticipantConfig {
  // Min number of participants required for experiment cohort to begin
  // (or null if no requirement)
  minParticipantsPerCohort: number|null;
  // Max number of participants for experiment cohort (or null if no limit)
  maxParticipantsPerCohort: number|null;
  // If false, exclude booted participant from min/max participant counts
  includeAllParticipantsInCohortCount: boolean;
}

/** Attention check config. */
export interface AttentionCheckConfig {
  enableAttentionChecks: boolean;
  waitSeconds: number;
  popupSeconds: number;
}

/** Prolific integration config. */
export interface ProlificConfig {
  enableProlificIntegration: boolean;
  defaultRedirectCode: string;
  attentionFailRedirectCode: string;
  bootedRedirectCode: string;
}

/** Experiment template with stage configs preloaded. */
export interface ExperimentTemplate extends Experiment {
  stageMap: Record<string, StageConfig>;
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
    id: config.id ?? generateId(),
    versionId: EXPERIMENT_VERSION_ID,
    metadata: config.metadata ?? createMetadataConfig(),
    permissions: config.permissions ?? createPermissionsConfig(),
    defaultCohortConfig: config.defaultCohortConfig ?? createCohortParticipantConfig(),
    attentionCheckConfig: config.attentionCheckConfig ?? createAttentionCheckConfig(),
    prolificConfig: config.prolificConfig ?? createProlificConfig(),
    stageIds: stages.map(stage => stage.id),
  };
}

/** Create CohortParticipantConfig. */
export function createCohortParticipantConfig(
  config: Partial<CohortParticipantConfig> = {},
): CohortParticipantConfig {
  return {
    minParticipantsPerCohort: config.minParticipantsPerCohort ?? null,
    maxParticipantsPerCohort: config.maxParticipantsPerCohort ?? null,
    includeAllParticipantsInCohortCount: config.includeAllParticipantsInCohortCount ?? false,
  };
}

/** Create AttentionCheckConfig. */
export function createAttentionCheckConfig(
  config: Partial<AttentionCheckConfig> = {},
): AttentionCheckConfig {
  return {
    enableAttentionChecks: config.enableAttentionChecks ?? false,
    waitSeconds: config.waitSeconds ?? 300, // 5 minutes
    popupSeconds: config.popupSeconds ?? 60, // 1 minute
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