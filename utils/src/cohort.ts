import {
  MetadataConfig,
  UnifiedTimestamp,
  createMetadataConfig,
  generateId,
} from './shared';
import {
  CohortParticipantConfig,
  createCohortParticipantConfig,
} from './experiment';

/** Experiment cohort types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Cohort. */
export interface CohortConfig {
  id: string;
  metadata: MetadataConfig;
  participantConfig: CohortParticipantConfig;
  // Maps stage ID to whether stage is unlocked (i.e., participants are ready)
  stageUnlockMap: Record<string, boolean>;
  // Maps variable name to value assigned specifically for this cohort.
  // This overrides any variable values set at the experiment level.
  variableMap?: Record<string, string>;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create CohortConfig. */
export function createCohortConfig(
  config: Partial<CohortConfig>,
): CohortConfig {
  return {
    id: config.id ?? generateId(true), // Alphanumeric sorting.
    metadata: config.metadata ?? createMetadataConfig(),
    participantConfig:
      config.participantConfig ?? createCohortParticipantConfig(),
    stageUnlockMap: config.stageUnlockMap ?? {},
    variableMap: config.variableMap ?? {},
  };
}
