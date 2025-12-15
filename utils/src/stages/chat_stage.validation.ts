import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';
import {UserType} from '../participant';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// updateChatStageConfig endpoint                                            //
// ************************************************************************* //
export const ChatStageConfigData = Type.Object(
  {
    id: Type.String(),
    kind: Type.Literal(StageKind.CHAT),
    name: Type.String(),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    timeLimitInMinutes: Type.Union([Type.Number(), Type.Null()]),
    requireFullTime: Type.Union([Type.Boolean(), Type.Null()]),
    // discussions
    // agents
  },
  {$id: 'ChatStageConfig'},
);

// ************************************************************************* //
// updateChatMessage endpoint                                                //
// ************************************************************************* //

/** UserType input validation. */
// TODO: Move to participant validation
export const UserTypeData = Type.Union([
  Type.Literal(UserType.PARTICIPANT),
  Type.Literal(UserType.MEDIATOR),
  Type.Literal(UserType.EXPERIMENTER),
  Type.Literal(UserType.SYSTEM),
  Type.Literal(UserType.UNKNOWN),
]);

/** ChatMessage input validation. */
export const ChatMessageData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    discussionId: Type.Union([Type.Null(), Type.String()]),
    type: UserTypeData,
    message: Type.String(),
    profile: Type.Object(
      {
        name: Type.Union([Type.Null(), Type.String()]),
        avatar: Type.Union([Type.Null(), Type.String()]),
        pronouns: Type.Union([Type.Null(), Type.String()]),
      },
      {$id: 'ChatMessageProfile', ...strict},
    ),
    // timestamp
  },
  {$id: 'ChatMessage'},
);

/** CreateChatMessageData. */
export const CreateChatMessageData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    // private participant ID (used in private chat cases)
    participantId: Type.String({minLength: 1}),
    chatMessage: ChatMessageData,
  },
  strict,
);

export type CreateChatMessageData = Static<typeof CreateChatMessageData>;

// ************************************************************************* //
// updateChatStageParticipantAnswer endpoint                                 //
// ************************************************************************* //

/** ChatStageParticipantAnswerData. */
export const ChatStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.CHAT),
    discussionTimestampMap: Type.Record(
      Type.String({minLength: 1}),
      Type.Union([Type.Null(), UnifiedTimestampSchema]),
    ),
  },
  strict,
);

/** UpdateChatStageParticipantAnswer endpoint validation. */
export const UpdateChatStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    chatStageParticipantAnswer: ChatStageParticipantAnswerData,
  },
  strict,
);

export type UpdateChatStageParticipantAnswerData = Static<
  typeof UpdateChatStageParticipantAnswerData
>;
