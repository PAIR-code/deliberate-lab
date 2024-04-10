import { Type, type Static } from '@sinclair/typebox';

export const ProfileAndTOS = Type.Object({
  name: Type.String(),
  pronouns: Type.String(),
  avatarUrl: Type.String(),
  acceptTosTimestamp: Type.String(),
});

export type ProfileAndTOS = Static<typeof ProfileAndTOS>;

export const Progression = Type.Object({
  justFinishedStageName: Type.String(),
});

export type Progression = Static<typeof Progression>;
