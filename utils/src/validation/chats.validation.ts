import { Type, type Static } from '@sinclair/typebox';
import { ChatKind } from '../types/chats.types';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Chat about items config */
export const ChatAboutItemsConfigData = Type.Object(
  {
    kind: Type.Literal(ChatKind.ChatAboutItems),
    ratingsToDiscuss: Type.Array(
      Type.Object(
        {
          item1: Type.String({ minLength: 1 }),
          item2: Type.String({ minLength: 1 }),
        },
        strict,
      ),
      { minItems: 1 },
    ),
  },
  strict,
);

export type ChatAboutItemsConfigData = Static<typeof ChatAboutItemsConfigData>;
