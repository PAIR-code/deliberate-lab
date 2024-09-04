import {
  MetadataConfig,
  createMetadataConfig,
  generateId
} from './shared';
import {
  ParticipantConfig,
  createParticipantConfig,
} from './experiment';

/** Experiment cohort types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Cohort. */
export interface CohortConfig {
  id: string;
  metadata: MetadataConfig;
  participantConfig: ParticipantConfig;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create CohortConfig. */
export function createCohortConfig(
  config: Partial<CohortConfig>
): CohortConfig {
  return {
    id: config.id ?? generateId(),
    metadata: config.metadata ?? createMetadataConfig(),
    participantConfig: config.participantConfig ?? createParticipantConfig(),
  };
}
