import {Type, type Static} from '@sinclair/typebox';
import {MetadataConfigSchema} from './shared.validation';
import {CohortParticipantConfigSchema} from './experiment.validation';
import {StageConfigData} from './stages/stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeCohort endpoint                                                      //
// ************************************************************************* //

export const CohortCreationData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortConfig: Type.Object(
      {
        id: Type.String(),
        metadata: MetadataConfigSchema,
        participantConfig: CohortParticipantConfigSchema,
        stageUnlockMap: Type.Record(Type.String(), Type.Boolean()),
        variableMap: Type.Optional(Type.Record(Type.String(), Type.String())),
      },
      strict,
    ),
  },
  strict,
);

export type CohortCreationData = Static<typeof CohortCreationData>;

// ************************************************************************* //
// updateCohortMetadata endpoint                                             //
// ************************************************************************* //

export const UpdateCohortMetadataData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    metadata: MetadataConfigSchema,
    participantConfig: CohortParticipantConfigSchema,
  },
  strict,
);

export type UpdateCohortMetadataData = Static<typeof UpdateCohortMetadataData>;

// ************************************************************************* //
// deleteCohort endpoint                                                     //
// ************************************************************************* //

export const CohortDeletionData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
  },
  strict,
);

export type CohortDeletionData = Static<typeof CohortDeletionData>;
