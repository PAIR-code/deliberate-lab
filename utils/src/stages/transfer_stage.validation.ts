import {Type} from '@sinclair/typebox';
import {StageKind} from './stage';
import {AutoTransferType} from './transfer_stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {CohortParticipantConfigSchema} from '../shared.validation';
import {ConditionSchema} from '../utils/condition.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// AutoTransferConfig validation schemas                                     //
// ************************************************************************* //

/** DefaultAutoTransferConfig validation */
export const DefaultAutoTransferConfigSchema = Type.Object(
  {
    type: Type.Literal(AutoTransferType.DEFAULT),
    autoCohortParticipantConfig: CohortParticipantConfigSchema,
    minParticipants: Type.Integer({minimum: 1}),
    maxParticipants: Type.Integer({minimum: 1}),
  },
  {...strict, $id: 'DefaultAutoTransferConfig'},
);

/** SurveyAutoTransferConfig validation */
export const SurveyAutoTransferConfigSchema = Type.Object(
  {
    type: Type.Literal(AutoTransferType.SURVEY),
    autoCohortParticipantConfig: CohortParticipantConfigSchema,
    surveyStageId: Type.String({minLength: 1}),
    surveyQuestionId: Type.String({minLength: 1}),
    participantCounts: Type.Record(Type.String(), Type.Integer({minimum: 1})),
  },
  {...strict, $id: 'SurveyAutoTransferConfig'},
);

/** GroupComposition validation */
export const GroupCompositionSchema = Type.Object(
  {
    id: Type.String({minLength: 1}),
    condition: ConditionSchema,
    minCount: Type.Integer({minimum: 1}),
    maxCount: Type.Integer({minimum: 1}),
  },
  {...strict, $id: 'GroupComposition'},
);

/** TransferGroup validation */
export const TransferGroupSchema = Type.Object(
  {
    id: Type.String({minLength: 1}),
    name: Type.String({minLength: 1}),
    composition: Type.Array(GroupCompositionSchema, {minItems: 1}),
    targetCohortAlias: Type.Optional(Type.String({minLength: 1})),
  },
  {...strict, $id: 'TransferGroup'},
);

/** ConditionAutoTransferConfig validation */
export const ConditionAutoTransferConfigSchema = Type.Object(
  {
    type: Type.Literal(AutoTransferType.CONDITION),
    autoCohortParticipantConfig: CohortParticipantConfigSchema,
    transferGroups: Type.Array(TransferGroupSchema, {minItems: 1}),
  },
  {...strict, $id: 'ConditionAutoTransferConfig'},
);

/** Union of all AutoTransferConfig types */
export const AutoTransferConfigSchema = Type.Union([
  DefaultAutoTransferConfigSchema,
  SurveyAutoTransferConfigSchema,
  ConditionAutoTransferConfigSchema,
]);

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** TransferStageConfig input validation. */
export const TransferStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.TRANSFER),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    enableTimeout: Type.Boolean(),
    timeoutSeconds: Type.Number(),
    autoTransferConfig: Type.Union([AutoTransferConfigSchema, Type.Null()]),
  },
  {...strict, $id: 'TransferStageConfig'},
);
