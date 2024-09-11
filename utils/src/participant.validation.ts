
import { Type, type Static } from '@sinclair/typebox';
import { ParticipantStatus } from './participant';
import { UnifiedTimestampSchema } from './shared.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// updateParticipantProfile endpoint for participants                        //
// ************************************************************************* //

/** ParticipantProfileBase input validation. */
export const ParticipantProfileBaseData = Type.Object(
  {
    pronouns: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 1 })])),
    avatar: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 1 })])),
    name: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 1 })])),
  },
  strict,
);

export type ParticipantProfileBaseData = Static<typeof ParticipantProfileBaseData>;

// ************************************************************************* //
// createParticipant endpoint for participants and experimenters             //
// ************************************************************************* //
export const CreateParticipantData = Type.Object(
  {
    experimentId: Type.String(),
    cohortId: Type.String(),
  },
  strict,
);

export type CreateParticipantData = Static<typeof CreateParticipantData>;

// ************************************************************************* //
// updateParticipant endpoint for experimenters                               //
// ************************************************************************* //

/** Participant statuses. */
export const ParticipantStatusData = Type.Union([
  Type.Literal(ParticipantStatus.IN_PROGRESS),
  Type.Literal(ParticipantStatus.SUCCESS),
  Type.Literal(ParticipantStatus.TRANSFER_PENDING),
  Type.Literal(ParticipantStatus.TRANSFER_TIMEOUT),
  Type.Literal(ParticipantStatus.TRANSFER_FAILED),
  Type.Literal(ParticipantStatus.TRANSFER_DECLINED),
  Type.Literal(ParticipantStatus.ATTENTION_TIMEOUT),
  Type.Literal(ParticipantStatus.BOOTED_OUT),
  Type.Literal(ParticipantStatus.DELETED),
]);

export const ProgressTimestampsSchema = Type.Object({
  acceptedTOS: Type.Union([Type.Null(), UnifiedTimestampSchema]),
  startExperiment: Type.Union([Type.Null(), UnifiedTimestampSchema]),
  endExperiment: Type.Union([Type.Null(), UnifiedTimestampSchema]),
  completedStages: Type.Record(
    Type.String(),
    UnifiedTimestampSchema
  ),
  cohortTransfers: Type.Record(
    Type.String(),
    UnifiedTimestampSchema
  )
});

export const ParticipantProfileExtendedData = Type.Object(
  {
    experimentId: Type.String(),
    participantConfig: Type.Object(
      {
        pronouns: Type.Union([Type.Null(), Type.String()]),
        name: Type.Union([Type.Null(), Type.String()]),
        avatar: Type.Union([Type.Null(), Type.String()]),
        privateId: Type.String(),
        publicId: Type.String(),
        prolificId: Type.Union([Type.Null(), Type.String()]),
        currentStageId: Type.String(),
        currentCohortId: Type.String(),
        transferCohortId: Type.Union([Type.Null(), Type.String()]),
        currentStatus: ParticipantStatusData,
        timestamps: ProgressTimestampsSchema,
      },
      strict,
    )
  },
  strict,
);

export type ParticipantProfileExtendedData = Static<typeof ParticipantProfileExtendedData>;