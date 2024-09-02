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

/** Experiment. */
export interface Experiment {
  id: string;
  metadata: MetadataConfig;
  permissions: PermissionsConfig;  
  defaultParticipantConfig: ParticipantConfig; // used by default for cohorts
  attentionCheckConfig: AttentionCheckConfig;
  prolificConfig: ProlificConfig;
  stageIds: string[]; // Ordered list of stage IDs
}

/** Experiment config for participant options. */
export interface ParticipantConfig {
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
  config: Partial<Experiment> = {}
): Experiment {
  return {
    id: generateId(),
    metadata: config.metadata ?? createMetadataConfig(),
    permissions: config.permissions ?? createPermissionsConfig(),
    defaultParticipantConfig: config.defaultParticipantConfig ?? createParticipantConfig(),
    attentionCheckConfig: config.attentionCheckConfig ?? createAttentionCheckConfig(),
    prolificConfig: config.prolificConfig ?? createProlificConfig(),
    stageIds: stages.map(stage => stage.id),
  };
}

/** Create ParticipantConfig. */
export function createParticipantConfig(
  config: Partial<ParticipantConfig> = {},
): ParticipantConfig {
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
  };
}