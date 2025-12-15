import {Type, type Static} from '@sinclair/typebox';
import {
  MetadataConfigSchema,
  PermissionsConfigSchema,
  CohortParticipantConfigSchema,
} from './shared.validation';
import {StageConfigData} from './stages/stage.validation';
import {
  AgentMediatorTemplateData,
  AgentParticipantTemplateData,
} from './agent.validation';
import {VariableConfigData} from './variables.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

/** Firestore collections that experiments can be written to. */
export const FirestoreCollectionData = Type.Union([
  Type.Literal('experimentTemplates'),
  Type.Literal('experiments'),
]);

// ************************************************************************* //
// writeExperimentCohortLock endpoint                                        //
// ************************************************************************* //
export const ExperimentCohortLockData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    isLock: Type.Boolean(),
  },
  strict,
);

export type ExperimentCohortLockData = Static<typeof ExperimentCohortLockData>;

// ************************************************************************* //
// deleteExperiment endpoint                                                 //
// ************************************************************************* //
export const ExperimentDeletionData = Type.Object(
  {
    // Firestore collection name to save experiment under
    // (e.g., 'experimentTemplates' if the experiment is a template)
    collectionName: FirestoreCollectionData,
    experimentId: Type.String({minLength: 1}),
  },
  strict,
);

export type ExperimentDeletionData = Static<typeof ExperimentDeletionData>;

// ************************************************************************* //
// writeExperiment endpoint                                                  //
// ************************************************************************* //

export const ProlificConfigSchema = Type.Object({
  enableProlificIntegration: Type.Boolean(),
  defaultRedirectCode: Type.String(),
  attentionFailRedirectCode: Type.String(),
  bootedRedirectCode: Type.String(),
});

/** CohortDefinition validation schema */
export const CohortDefinitionSchema = Type.Object(
  {
    id: Type.String({minLength: 1}),
    alias: Type.String({minLength: 1}),
    name: Type.String({minLength: 1}),
    description: Type.Optional(Type.String()),
    generatedCohortId: Type.Optional(Type.String()),
  },
  strict,
);

export const ExperimentCreationData = Type.Object(
  {
    // Firestore collection name to save experiment under
    // (e.g., 'experimentTemplates' if the experiment is a template)
    collectionName: FirestoreCollectionData,
    experimentTemplate: Type.Object({
      id: Type.String(),
      // Experiment config (excluding ordered stage IDs)
      experiment: Type.Object(
        {
          id: Type.String(),
          versionId: Type.Number(),
          metadata: MetadataConfigSchema,
          permissions: PermissionsConfigSchema,
          defaultCohortConfig: CohortParticipantConfigSchema,
          prolificConfig: ProlificConfigSchema,
          stageIds: Type.Array(Type.String()),
          cohortLockMap: Type.Record(Type.String(), Type.Boolean()),
          variableConfigs: Type.Optional(Type.Array(VariableConfigData)),
          variableMap: Type.Optional(Type.Record(Type.String(), Type.String())),
          cohortDefinitions: Type.Optional(Type.Array(CohortDefinitionSchema)),
        },
        strict,
      ),
      stageConfigs: Type.Array(StageConfigData),
      agentMediators: Type.Array(AgentMediatorTemplateData),
      agentParticipants: Type.Array(AgentParticipantTemplateData),
    }),
  },
  strict,
);

export type ExperimentCreationData = Static<typeof ExperimentCreationData>;
