import { Type, type Static } from '@sinclair/typebox';
import {
  MetadataConfigSchema,
  PermissionsConfigSchema
} from './shared.validation';
import { StageConfigData } from './stages/stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// deleteExperiment endpoint                                                 //
// ************************************************************************* //
export const ExperimentDeletionData = Type.Object(
  {
    id: Type.String({ minLength: 1}),
  },
  strict,
);

export type ExperimentDelectionData = Static<typeof ExperimentDeletionData>;

// ************************************************************************* //
// createExperiment endpoint                                                 //
// ************************************************************************* //
export const ParticipantConfigSchema = Type.Object({
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
});

export const ExperimentCreationData = Type.Object(
  {
    isTemplate: Type.Boolean(), // whether or not to create template
    experimentConfig: Type.Object(
      {
        metadata: MetadataConfigSchema,
        permissions: PermissionsConfigSchema,
        participantConfig: ParticipantConfigSchema,
        attentionCheckConfig: AttentionCheckConfigSchema,
        prolificConfig: ProlificConfigSchema,
      },
      strict,
    ),
    stageConfigs: Type.Array(StageConfigData),
  },
  strict,
);

export type ExperimentCreationData = Static<typeof ExperimentCreationData>;