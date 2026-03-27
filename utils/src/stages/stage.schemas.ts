import {Type} from '@sinclair/typebox';
import {StageKind} from './stage';

/**
 * Shared schema definitions that are referenced by other stage validation schemas.
 * These are defined in a separate file to ensure they're bundled before Type.Ref() calls.
 */

/** StageTextConfig input validation. */
export const StageTextConfigSchema = Type.Object(
  {
    primaryText: Type.String(),
    infoText: Type.String(),
    helpText: Type.String(),
  },
  {$id: 'StageTextConfig'},
);

/** StageProgressConfig input validation. */
export const StageProgressConfigSchema = Type.Object(
  {
    minParticipants: Type.Integer(),
    waitForAllParticipants: Type.Boolean(),
    showParticipantProgress: Type.Boolean(),
  },
  {$id: 'StageProgressConfig'},
);

/** BaseStageConfig input validation (mirrors BaseStageConfig interface). */
export const BaseStageConfigSchema = Type.Object({
  id: Type.String({minLength: 1}),
  kind: Type.Enum(StageKind),
  name: Type.String({minLength: 1}),
  descriptions: StageTextConfigSchema,
  progress: StageProgressConfigSchema,
});
