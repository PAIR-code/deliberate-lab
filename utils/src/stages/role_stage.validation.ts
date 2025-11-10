import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** RoleItem data validation. */
export const RoleItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    name: Type.String(),
    displayLines: Type.Array(Type.String()),
    minParticipants: Type.Number(),
    maxParticipants: Type.Union([Type.Number(), Type.Null()]),
  },
  strict,
);

/** RoleStageConfig input validation. */
export const RoleStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.ROLE),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    roles: Type.Array(RoleItemData),
  },
  strict,
);

/** setParticipantRoles endpoint data validation. */
export const SetParticipantRolesData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
  },
  strict,
);

export type SetParticipantRolesData = Static<typeof SetParticipantRolesData>;
