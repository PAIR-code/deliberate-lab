import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {BaseStageConfig, StageKind} from './stage';
import {ChatDiscussionType} from './chat_stage';
import {
  BaseStageConfigSchema,
  type StageValidationResult,
} from './stage.schemas';
import {UserType} from '../participant';
import {ChatMessageReaction, MAX_CHAT_QUOTE_LENGTH} from '../chat_message';
import {ChatStageConfig} from './chat_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// ChatDiscussion types                                                      //
// ************************************************************************* //

/** DiscussionItem input validation. */
export const DiscussionItemData = Type.Object(
  {
    id: Type.String(),
    imageId: Type.String(),
    name: Type.String(),
  },
  {$id: 'DiscussionItem', ...strict},
);

/** DefaultChatDiscussion input validation. */
export const DefaultChatDiscussionData = Type.Object(
  {
    id: Type.String(),
    type: Type.Literal(ChatDiscussionType.DEFAULT),
    description: Type.String(),
  },
  {$id: 'DefaultChatDiscussion', ...strict},
);

/** CompareChatDiscussion input validation. */
export const CompareChatDiscussionData = Type.Object(
  {
    id: Type.String(),
    type: Type.Literal(ChatDiscussionType.COMPARE),
    description: Type.String(),
    items: Type.Array(DiscussionItemData),
  },
  {$id: 'CompareChatDiscussion', ...strict},
);

/** ChatDiscussion input validation (discriminated union on `type`). */
export const ChatDiscussionData = Type.Union([
  DefaultChatDiscussionData,
  CompareChatDiscussionData,
]);

// ************************************************************************* //
// updateChatStageConfig endpoint                                            //
// ************************************************************************* //
export const ChatStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.CHAT),
        timeLimitInMinutes: Type.Optional(
          Type.Union([Type.Integer({minimum: 1}), Type.Null()]),
        ),
        timeMinimumInMinutes: Type.Optional(
          Type.Union([Type.Integer({minimum: 1}), Type.Null()]),
        ),
        discussions: Type.Array(ChatDiscussionData),
        isTurnBased: Type.Optional(Type.Boolean()),
        enableReactionsAndReplies: Type.Optional(Type.Boolean()),
      },
      strict,
    ),
  ],
  {$id: 'ChatStageConfig', ...strict},
);

/** Validate cross-field business rules for chat time configs. */
export function validateChatStageConfig(
  stage: BaseStageConfig,
): StageValidationResult {
  const {timeMinimumInMinutes: min, timeLimitInMinutes: max} =
    stage as ChatStageConfig;

  if (min != null && max != null && min > max) {
    return {
      valid: false,
      error: `timeMinimumInMinutes (${min}) cannot exceed timeLimitInMinutes (${max})`,
    };
  }

  return {valid: true};
}

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

/** ChatMessageReaction input validation. */
export const ChatMessageReactionData = Type.Union([
  Type.Literal(ChatMessageReaction.HEART),
  Type.Literal(ChatMessageReaction.THUMBS_UP),
]);

/** ChatMessageReply input validation. */
export const ChatMessageReplyData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    senderId: Type.String(),
    name: Type.String(),
    message: Type.String({maxLength: MAX_CHAT_QUOTE_LENGTH + 1}),
  },
  {$id: 'ChatMessageReply', ...strict},
);

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
    replyTo: Type.Optional(Type.Union([Type.Null(), ChatMessageReplyData])),
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
// updateChatMessageReaction endpoint                                        //
// ************************************************************************* //

/** UpdateChatMessageReactionData. */
export const UpdateChatMessageReactionData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    // private participant ID (used in private chat cases)
    participantId: Type.String({minLength: 1}),
    chatMessageId: Type.String({minLength: 1}),
    // public ID of the participant applying/removing the reaction
    senderId: Type.String({minLength: 1}),
    reaction: ChatMessageReactionData,
    // true to apply the reaction, false to remove it
    add: Type.Boolean(),
  },
  strict,
);

export type UpdateChatMessageReactionData = Static<
  typeof UpdateChatMessageReactionData
>;

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
