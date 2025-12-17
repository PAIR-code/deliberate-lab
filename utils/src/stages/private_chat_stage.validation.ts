import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

export const PrivateChatStageConfigData = Type.Object({
  id: Type.String(),
  kind: Type.Literal(StageKind.PRIVATE_CHAT),
  name: Type.String(),
  descriptions: Type.Ref(StageTextConfigSchema),
  progress: Type.Ref(StageProgressConfigSchema),
  // If defined, ends chat after specified time limit
  // (starting from when the first message is sent)
  timeLimitInMinutes: Type.Union([Type.Number(), Type.Null()]),
  // Require participants to stay in chat until time limit is up
  requireFullTime: Type.Optional(Type.Boolean()),
  // If true, requires participant to go back and forth with mediator(s)
  // (rather than being able to send multiple messages at once)
  isTurnBasedChat: Type.Optional(Type.Boolean()),
  // Minimum number of messages participant must send to move on
  minNumberOfTurns: Type.Optional(Type.Number()),
  // If turn based chat set to true, this specifies the max
  // number of messages the participant can send
  maxNumberOfTurns: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});
