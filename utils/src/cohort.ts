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
  };
}
