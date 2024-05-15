import { MessageKind } from '@llm-mediation-experiments/utils';
import { Type, type Static } from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Message sent by an user */
export const UserMessageData = Type.Object(
  {
    kind: Type.Literal(MessageKind.UserMessage),
    text: Type.String({ minLength: 1 }),
    fromPublicParticipantId: Type.String({ minLength: 1 }),
  },
  strict,
);

/** Message sent by an experimenter to discuss about items */
export const DiscussItemsMessageData = Type.Object(
  {
    kind: Type.Literal(MessageKind.DiscussItemsMessage),
    text: Type.String({ minLength: 1 }),
    itemPair: Type.Object({
      item1: Type.String({ minLength: 1 }),
      item2: Type.String({ minLength: 1 }),
    }),
  },
  strict,
);

/** Message send by a mediator */
export const MediatorMessageData = Type.Object(
  {
    kind: Type.Literal(MessageKind.MediatorMessage),
    text: Type.String({ minLength: 1 }),
  },
  strict,
);

export const MessageData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    chatId: Type.String({ minLength: 1 }),
    message: Type.Union([UserMessageData, DiscussItemsMessageData, MediatorMessageData]),
  },
  strict,
);

export type MessageData = Static<typeof MessageData>;
