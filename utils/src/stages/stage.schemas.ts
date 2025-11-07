import {Type} from '@sinclair/typebox';

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
    minParticipants: Type.Number(),
    waitForAllParticipants: Type.Boolean(),
    showParticipantProgress: Type.Boolean(),
  },
  {$id: 'StageProgressConfig'},
);
