import { Type, type Static } from '@sinclair/typebox';

export const PROGRESSION = {
  justFinishedStageName: Type.Optional(Type.String()),
};

export const ProfileAndTOS = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    pronouns: Type.String({ minLength: 1 }),
    avatarUrl: Type.String({ minLength: 1 }),
    acceptTosTimestamp: Type.String(),
    ...PROGRESSION,
  },
  { additionalProperties: false },
);

export type ProfileAndTOS = Static<typeof ProfileAndTOS>;

export const Progression = Type.Object(PROGRESSION);

export type Progression = Static<typeof Progression>;
