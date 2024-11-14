import {
  MetadataConfig,
  UnifiedTimestamp,
  createMetadataConfig,
  generateId
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
  // Maps from stage ID to timestamp of when stage was started
  // by participants (e.g., after waiting screen)
  stageTimestampMap: Record<string, UnifiedTimestamp>;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create CohortConfig. */
export function createCohortConfig(
  config: Partial<CohortConfig>
): CohortConfig {
  return {
    id: config.id ?? generateId(true), // Alphanumeric sorting.
    metadata: config.metadata ?? createMetadataConfig(),
    participantConfig: config.participantConfig ?? createCohortParticipantConfig(),
    stageTimestampMap: config.stageTimestampMap ?? {},
  };
}
