import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageGameSchema,
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

export const SalespersonStageConfigData = Type.Object({
  id: Type.String(),
  kind: Type.Literal(StageKind.SALESPERSON),
  game: StageGameSchema,
  name: Type.String(),
  descriptions: StageTextConfigSchema,
  progress: StageProgressConfigSchema,
  // TODO: Add board
});
