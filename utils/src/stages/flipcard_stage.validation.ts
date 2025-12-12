import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// FlipCard stage validation                                                //
// ************************************************************************* //

/** FlipCard item validation. */
export const FlipCardData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    title: Type.String(), // Allow empty titles (content may be in frontContent via template variables)
    frontContent: Type.String({minLength: 1}),
    backContent: Type.String({minLength: 1}),
  },
  {$id: 'FlipCard', ...strict},
);

/** FlipCard stage config validation. */
export const FlipCardStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.FLIPCARD),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    cards: Type.Array(FlipCardData),
    enableSelection: Type.Boolean(),
    allowMultipleSelections: Type.Boolean(),
    requireConfirmation: Type.Boolean(),
    minUniqueCardsFlippedRequirement: Type.Number(),
    shuffleCards: Type.Boolean(),
  },
  {$id: 'FlipCardStageConfig', ...strict},
);

/** FlipCard stage participant answer validation. */
export const FlipCardStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.FLIPCARD),
    selectedCardIds: Type.Array(Type.String()),
    flippedCardIds: Type.Array(Type.String()),
    flipHistory: Type.Array(
      Type.Object(
        {
          cardId: Type.String({minLength: 1}),
          action: Type.Union([
            Type.Literal('flip_to_back'),
            Type.Literal('flip_to_front'),
          ]),
          timestamp: UnifiedTimestampSchema,
        },
        strict,
      ),
    ),
    confirmed: Type.Boolean(),
    timestamp: UnifiedTimestampSchema,
  },
  strict,
);

// ************************************************************************* //
// updateFlipCardStageParticipantAnswer endpoint                            //
// ************************************************************************* //

/** FlipCard stage participant answer update data validation. */
export const UpdateFlipCardStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    flipCardStageParticipantAnswer: FlipCardStageParticipantAnswerData,
  },
  strict,
);

export type UpdateFlipCardStageParticipantAnswerData = Static<
  typeof UpdateFlipCardStageParticipantAnswerData
>;
