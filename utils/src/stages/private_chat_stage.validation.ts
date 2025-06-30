import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageGameSchema,
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';
import {ChatMessageType} from '../chat_message';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

export const PrivateChatStageConfigData = Type.Object({
  id: Type.String(),
  kind: Type.Literal(StageKind.PRIVATE_CHAT),
  game: StageGameSchema,
  name: Type.String(),
  descriptions: StageTextConfigSchema,
  progress: StageProgressConfigSchema,
});
