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

export const UpdateParticipantProfileData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
    participantProfileBase: ParticipantProfileBaseData,
  },
  strict
);

export type UpdateParticipantProfileData = Static<typeof UpdateParticipantProfileData>;

// ************************************************************************* //
// updateParticipantAcceptedTOS endpoint for participants                    //
// ************************************************************************* //
const UpdateParticipantAcceptedTOSData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
    acceptedTOS: Type.Union([Type.Null(), UnifiedTimestampSchema]),
  },
  strict,
);

export type UpdateParticipantAcceptedTOSData = Static<typeof UpdateParticipantAcceptedTOSData>;

// ************************************************************************* //
// updateParticipantFailure endpoint for participants                        //
// ************************************************************************* //
const UpdateParticipantFailureData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal(ParticipantStatus.TRANSFER_DECLINED),
      Type.Literal(ParticipantStatus.TRANSFER_TIMEOUT)
    ])
  },
  strict,
);

export type UpdateParticipantFailureData = Static<typeof UpdateParticipantFailureData>;

// ************************************************************************* //
// updateParticipantToNextStage, acceptParticipantTransfer, etc. endpoints   //
// (anything where just the participant document path is needed)             //
// ************************************************************************* //
const BaseParticipantData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
  },
  strict,
);

export type BaseParticipantData = Static<typeof BaseParticipantData>;

// ************************************************************************* //
// initiateParticipantTransfer endpoint for experimenters                    //
// ************************************************************************* //
const InitiateParticipantTransferData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    cohortId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
  },
  strict,
);

export type InitiateParticipantTransferData = Static<typeof InitiateParticipantTransferData>;

// ************************************************************************* //
// sendParticipantCheck endpoint for experimenters                           //
// ************************************************************************* //
const SendParticipantCheckData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal(ParticipantStatus.ATTENTION_CHECK),
    ]),
    customMessage: Type.String()
  },
  strict,
);

export type SendParticipantCheckData = Static<typeof SendParticipantCheckData>;

// ************************************************************************* //
// createParticipant endpoint for participants and experimenters             //
// ************************************************************************* //
export const CreateParticipantData = Type.Object(
  {
    experimentId: Type.String(),
    cohortId: Type.String(),
    isAnonymous: Type.Boolean(), // true if requires anonymous profiles
    prolificId: Type.Optional(Type.Union([Type.Null(), Type.String()])),
  },
  strict,
);

export type CreateParticipantData = Static<typeof CreateParticipantData>;

// ************************************************************************* //
// updateParticipant endpoint for experimenters                               //
// ************************************************************************* //

/** Participant statuses. */
export const ParticipantStatusData = Type.Union([
  Type.Literal(ParticipantStatus.ATTENTION_CHECK),
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
  completedWaiting: Type.Record(
    Type.String(),
    UnifiedTimestampSchema
  ),
  cohortTransfers: Type.Record(
    Type.String(),
    UnifiedTimestampSchema
  )
});

export const AnonymousProfileSchema = Type.Object({
  name: Type.String(),
  repeat: Type.Number(),
  avatar: Type.String(),
});

export const ParticipantProfileExtendedData = Type.Object(
  {
    experimentId: Type.String(),
    isTransfer: Type.Boolean(),
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
        anonymousProfiles: Type.Record(Type.String(), AnonymousProfileSchema),
      },
      strict,
    )
  },
  strict,
);

export type ParticipantProfileExtendedData = Static<typeof ParticipantProfileExtendedData>;