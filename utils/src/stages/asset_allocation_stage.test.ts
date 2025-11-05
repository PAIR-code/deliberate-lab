import {
  MultiAssetAllocationStagePublicData,
  MultiAssetAllocationStageParticipantAnswer,
  computeMultiAssetConsensusScore,
  computeKrippendorffsAlpha,
} from './asset_allocation_stage';
import {StageKind} from './stage';
import {Timestamp} from 'firebase/firestore';

const createMockAnswer = (
  allocations: Record<string, number>,
): MultiAssetAllocationStageParticipantAnswer => ({
  id: `participant-${Math.random()}`,
  kind: StageKind.MULTI_ASSET_ALLOCATION,
  allocationMap: Object.entries(allocations).reduce(
    (acc, [id, percentage]) => {
      acc[id] = {id, name: `Charity ${id}`, percentage};
      return acc;
    },
    {} as Record<string, {id: string; name: string; percentage: number}>,
  ),
  isConfirmed: true,
  confirmedTimestamp: Timestamp.now(),
});

describe('computeKrippendorffsAlpha', () => {
  it('should correctly calculate the full-data example from Krippendorff (2011, p. 3) as interval data', () => {
    // This data is from "Example B" in the paper, which has no missing values.
    // We map the nominal categories a,b,c,d,e to interval values 1,2,3,4,5.
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-krippendorff-example-b',
      kind: StageKind.MULTI_ASSET_ALLOCATION,
      participantAnswerMap: {
        Ben: createMockAnswer({
          u1: 1,
          u2: 1,
          u3: 2,
          u4: 2,
          u5: 4,
          u6: 3,
          u7: 3,
          u8: 3,
          u9: 5,
          u10: 4,
          u11: 4,
          u12: 1,
        }),
        Gerry: createMockAnswer({
          u1: 2,
          u2: 1,
          u3: 2,
          u4: 2,
          u5: 2,
          u6: 3,
          u7: 3,
          u8: 3,
          u9: 5,
          u10: 4,
          u11: 4,
          u12: 4,
        }),
      },
    };
    expect(computeKrippendorffsAlpha(publicData)).toBeCloseTo(62.03);
  });
});

describe('computeConsensusScore', () => {
  it('should return 100 for perfect agreement (alpha = 100)', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: StageKind.MULTI_ASSET_ALLOCATION,
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 70, assetB: 30}),
        p2: createMockAnswer({assetA: 70, assetB: 30}),
      },
    };
    expect(computeMultiAssetConsensusScore(publicData)).toBe(100);
  });

  it('should return a high score for strong partial agreement (alpha > 0)', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: StageKind.MULTI_ASSET_ALLOCATION,
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 80, assetB: 20}),
        p2: createMockAnswer({assetA: 70, assetB: 30}),
        p3: createMockAnswer({assetA: 60, assetB: 40}),
      },
    };
    expect(computeMultiAssetConsensusScore(publicData)).toBeCloseTo(86.61);
  });

  it('should return a low score for mild systematic disagreement (alpha < 0)', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: StageKind.MULTI_ASSET_ALLOCATION,
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 100, assetB: 0}),
        p2: createMockAnswer({assetA: 0, assetB: 100}),
        p3: createMockAnswer({assetA: 50, assetB: 50}),
      },
    };
    expect(computeMultiAssetConsensusScore(publicData)).toBeCloseTo(6.25);
  });

  it('should return 0 for maximum systematic disagreement (alpha = -33.3)', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: StageKind.MULTI_ASSET_ALLOCATION,
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 100}),
        p2: createMockAnswer({assetB: 100}),
        p3: createMockAnswer({assetC: 100}),
      },
    };
    // The raw alpha is the theoretical minimum of -33.33...
    expect(computeMultiAssetConsensusScore(publicData)).toBeCloseTo(0);
  });
});
