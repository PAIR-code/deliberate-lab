import {
  BaseStageConfig,
  BaseStagePublicData,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

export interface NegotiationPayoutStageConfig extends BaseStageConfig {
  kind: StageKind.NEGOTIATION_PAYOUT;
}

export interface NegotiationPayoutStagePublicData extends BaseStagePublicData {
  kind: StageKind.NEGOTIATION_PAYOUT;
}

export function createNegotiationPayoutStage(
  config: Partial<NegotiationPayoutStageConfig> = {},
): NegotiationPayoutStageConfig {
  return {
    id: config.id ?? 'negotiation_payout_summary',
    kind: StageKind.NEGOTIATION_PAYOUT,
    name: config.name ?? 'Task 2: Negotiation Payout Summary',
    descriptions:
      config.descriptions ??
      createStageTextConfig({
        primaryText:
          'Here is the summary of the final negotiation and coalition payout results.',
      }),
    progress:
      config.progress ??
      createStageProgressConfig({
        showParticipantProgress: true,
      }),
  };
}

export function createNegotiationPayoutStagePublicData(
  config: NegotiationPayoutStageConfig,
): NegotiationPayoutStagePublicData {
  return {
    id: config.id,
    kind: StageKind.NEGOTIATION_PAYOUT,
  };
}
