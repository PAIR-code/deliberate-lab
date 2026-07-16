import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** NegotiationProfileItem data validation. */
export const NegotiationProfileItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    name: Type.String(),
    avatar: Type.String(),
    displayLines: Type.Array(Type.String()),
  },
  strict,
);

/** NegotiationProfileStageConfig input validation. */
export const NegotiationProfileStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.NEGOTIATION_PROFILE),
        items: Type.Array(NegotiationProfileItemData),
      },
      strict,
    ),
  ],
  {$id: 'NegotiationProfileStageConfig', ...strict},
);

/** setParticipantNegotiationProfiles endpoint data validation. */
export const SetParticipantNegotiationProfilesData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
  },
  strict,
);

export type SetParticipantNegotiationProfilesData = Static<
  typeof SetParticipantNegotiationProfilesData
>;
