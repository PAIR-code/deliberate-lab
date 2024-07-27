import { Type, type Static } from '@sinclair/typebox';
import { MessageKind } from '../types/messages.types';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Message sent by an user */
export const UserMessageData = Type.Object(
  {
    kind: Type.Literal(MessageKind.UserMessage),
    text: Type.String({ minLength: 1 }),
    fromPrivateParticipantId: Type.String({ minLength: 1 }),
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
    name: Type.String(),
    avatar: Type.String(),
  },
  strict,
);

export const MessageData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    stageId: Type.String({ minLength: 1 }),
    message: Type.Union([UserMessageData, DiscussItemsMessageData, MediatorMessageData]),
  },
  strict,
);

export type MessageData = Static<typeof MessageData>;
