import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {BaseStageConfig, StageKind} from './stage';
import {
  BaseStageConfigSchema,
  type StageValidationResult,
} from './stage.schemas';
import {validateChatStageConfig} from './chat_stage.validation';
import {PrivateChatStageConfig} from './private_chat_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

export const PrivateChatStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.PRIVATE_CHAT),
        // If defined, ends chat after specified time limit
        // (starting from when the first message is sent)
        timeLimitInMinutes: Type.Union([Type.Number(), Type.Null()]),
        timeMinimumInMinutes: Type.Optional(
          Type.Union([Type.Number(), Type.Null()]),
        ),
        // If true, requires participant to go back and forth with mediator(s)
        // (rather than being able to send multiple messages at once)
        isTurnBasedChat: Type.Optional(Type.Boolean()),
        // Minimum number of messages participant must send to move on
        minNumberOfTurns: Type.Optional(Type.Number()),
        // If turn based chat set to true, this specifies the max
        // number of messages the participant can send
        maxNumberOfTurns: Type.Optional(
          Type.Union([Type.Number(), Type.Null()]),
        ),
        // If true, prevents participants from cancelling pending requests
        // while waiting for a response (to prevent gaming minimum message counts)
        preventCancellation: Type.Optional(Type.Boolean()),
      },
      strict,
    ),
  ],
  {$id: 'PrivateChatStageConfig', ...strict},
);

/** Validate cross-field business rules for private chat stage configs. */
export function validatePrivateChatStageConfig(
  stage: BaseStageConfig,
): StageValidationResult {
  // Check time constraints (shared with group chat)
  const timeResult = validateChatStageConfig(stage);
  if (!timeResult.valid) return timeResult;

  const {minNumberOfTurns: minTurns, maxNumberOfTurns: maxTurns} =
    stage as PrivateChatStageConfig;

  if (minTurns != null && maxTurns != null && minTurns > maxTurns) {
    return {
      valid: false,
      error: `minNumberOfTurns (${minTurns}) cannot exceed maxNumberOfTurns (${maxTurns})`,
    };
  }

  return {valid: true};
}
