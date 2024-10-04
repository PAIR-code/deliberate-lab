import { Type, type Static } from '@sinclair/typebox';
import {
  MetadataConfigSchema,
  PermissionsConfigSchema
} from './shared.validation';
import { StageConfigData } from './stages/stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Firestore collections that experiments can be written to. */
export const FirestoreCollectionData = Type.Union([
    Type.Literal('experimentTemplates'),
    Type.Literal('experiments')
]);

// ************************************************************************* //
// deleteExperiment endpoint                                                 //
// ************************************************************************* //
export const ExperimentDeletionData = Type.Object(
  {
    // Firestore collection name to save experiment under
    // (e.g., 'experimentTemplates' if the experiment is a template)
    collectionName: FirestoreCollectionData,
    experimentId: Type.String({ minLength: 1}),
  },
  strict,
);

export type ExperimentDeletionData = Static<typeof ExperimentDeletionData>;

// ************************************************************************* //
// writeExperiment endpoint                                                  //
// ************************************************************************* //
export const CohortParticipantConfigSchema = Type.Object({
  minParticipantsPerCohort: Type.Union([Type.Null(), Type.Number({ minimum: 0 })]),
  maxParticipantsPerCohort: Type.Union([Type.Null(), Type.Number({ minimum: 1 })]),
  includeAllParticipantsInCohortCount: Type.Boolean(),
});

export const AttentionCheckConfigSchema = Type.Object({
  enableAttentionChecks: Type.Boolean(),
  waitSeconds: Type.Number({ minimum: 0 }),
  popupSeconds: Type.Number({ minimum: 0 }),
});

export const ProlificConfigSchema = Type.Object({
  enableProlificIntegration: Type.Boolean(),
  defaultRedirectCode: Type.String(),
  attentionFailRedirectCode: Type.String(),
  bootedRedirectCode: Type.String(),
});

export const ExperimentCreationData = Type.Object(
  {
    // Firestore collection name to save experiment under
    // (e.g., 'experimentTemplates' if the experiment is a template)
    collectionName: FirestoreCollectionData,
    // Experiment config (excluding ordered stage IDs)
    experimentConfig: Type.Object(
      {
        id: Type.String(),
        versionId: Type.Number(),
        metadata: MetadataConfigSchema,
        permissions: PermissionsConfigSchema,
        defaultCohortConfig: CohortParticipantConfigSchema,
        attentionCheckConfig: AttentionCheckConfigSchema,
        prolificConfig: ProlificConfigSchema,
        stageIds: Type.Array(Type.String()),
      },
      strict,
    ),
    stageConfigs: Type.Array(StageConfigData),
  },
  strict,
);

export type ExperimentCreationData = Static<typeof ExperimentCreationData>;