import { Type, type Static } from '@sinclair/typebox';

export const UserMessageMutationData = Type.Object({
  chatId: Type.String({ minLength: 1 }),
  text: Type.String({ minLength: 1 }),
  fromUserId: Type.String({ minLength: 1 }),
});

export const DiscussItemsMessageMutationData = Type.Object({
  chatId: Type.String({ minLength: 1 }),
  text: Type.String({ minLength: 1 }),
  itemPair: Type.Object({
    item1: Type.Object({
      name: Type.String({ minLength: 1 }),
      imageUrl: Type.String({ minLength: 1 }),
    }),
    item2: Type.Object({
      name: Type.String({ minLength: 1 }),
      imageUrl: Type.String({ minLength: 1 }),
    }),
  }),
});

export const MediatorMessageMutationData = Type.Object({
  chatId: Type.String({ minLength: 1 }),
  text: Type.String({ minLength: 1 }),
});

export type UserMessageMutationData = Static<typeof UserMessageMutationData>;

export type DiscussItemsMessageMutationData = Static<typeof DiscussItemsMessageMutationData>;

export type MediatorMessageMutationData = Static<typeof MediatorMessageMutationData>;
