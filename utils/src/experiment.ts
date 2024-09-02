import { MetadataConfig, PermissionsConfig } from './shared';
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
  participantConfig: ParticipantConfig;
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
