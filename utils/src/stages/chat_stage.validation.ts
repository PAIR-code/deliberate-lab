import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageGameSchema,
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';
import {ChatMessageType} from './chat_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// updateChatStageConfig endpoint                                            //
// ************************************************************************* //
export const ChatStageConfigData = Type.Object({
  id: Type.String(),
  kind: Type.Literal(StageKind.CHAT),
  game: StageGameSchema,
  name: Type.String(),
  descriptions: StageTextConfigSchema,
  progress: StageProgressConfigSchema,
  timeLimitInMinutes: Type.Union([Type.Number(), Type.Null()]),
  requireFullTime: Type.Union([Type.Boolean(), Type.Null()]),
  // discussions
  // agents
});

// ************************************************************************* //
// updateChatMessage endpoint                                                //
// ************************************************************************* //

/** ChatMessageType input validation. */
export const ChatMessageTypeData = Type.Union([
  Type.Literal(ChatMessageType.PARTICIPANT),
  Type.Literal(ChatMessageType.MEDIATOR),
  Type.Literal(ChatMessageType.EXPERIMENTER),
  Type.Literal(ChatMessageType.HUMAN_AGENT),
  Type.Literal(ChatMessageType.AGENT_AGENT),
]);

/** ChatMessage input validation. */
export const ChatMessageData = Type.Object({
  id: Type.String({minLength: 1}),
  discussionId: Type.Union([Type.Null(), Type.String()]),
  type: ChatMessageTypeData,
  message: Type.String(),
  profile: Type.Object(
    {
      name: Type.Union([Type.Null(), Type.String()]),
      avatar: Type.Union([Type.Null(), Type.String()]),
      pronouns: Type.Union([Type.Null(), Type.String()]),
    },
    strict,
  ),
  // timestamp
});

/** CreateChatMessageData. */
export const CreateChatMessageData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
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
