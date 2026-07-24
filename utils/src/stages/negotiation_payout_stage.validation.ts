import {Type} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';

const strict = {additionalProperties: false} as const;

/** NegotiationPayoutStageConfig input validation. */
export const NegotiationPayoutStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.NEGOTIATION_PAYOUT),
      },
      strict,
    ),
  ],
  {$id: 'NegotiationPayoutStageConfig', ...strict},
);
