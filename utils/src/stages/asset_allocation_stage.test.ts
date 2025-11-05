import {
  MultiAssetAllocationStagePublicData,
  MultiAssetAllocationStageParticipantAnswer,
  computeMultiAssetConsensusScore,
  computeKrippendorffsAlpha,
} from './asset_allocation_stage';
import {Timestamp} from 'firebase/firestore';

// Helper to create a mock participant answer
const createMockAnswer = (
  allocations: Record<string, number>,
): MultiAssetAllocationStageParticipantAnswer => ({
  id: `participant-${Math.random()}`,
  kind: 'multi-asset-allocation',
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
  it('should return 100 for perfect agreement', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 70, assetB: 30}),
        p2: createMockAnswer({assetA: 70, assetB: 30}),
      },
    };
    expect(computeKrippendorffsAlpha(publicData)).toBe(100);
  });

  it('should return a negative score for systematic disagreement', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 100, assetB: 0}),
        p2: createMockAnswer({assetA: 0, assetB: 100}),
      },
    };
    // Correct alpha is -50
    expect(computeKrippendorffsAlpha(publicData)).toBeCloseTo(-50);
  });

  it('should correctly calculate a non-zero agreement score', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 80, assetB: 20}),
        p2: createMockAnswer({assetA: 70, assetB: 30}),
        p3: createMockAnswer({assetA: 60, assetB: 40}),
      },
    };
    // Correct alpha is 82.14
    expect(computeKrippendorffsAlpha(publicData)).toBeCloseTo(82.14);
  });
});

describe('computeConsensusScore', () => {
  it('should return 100 for perfect agreement', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 70, assetB: 30}),
        p2: createMockAnswer({assetA: 70, assetB: 30}),
      },
    };
    // Alpha is 100, max(0, 100) = 100
    expect(computeMultiAssetConsensusScore(publicData)).toBe(100);
  });

  it('should return 0 for agreement equal to random chance', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 100}),
        p2: createMockAnswer({assetB: 100}),
        p3: createMockAnswer({assetA: 50, assetB: 50}),
      },
    };
    // Alpha is ~0, max(0, 0) = 0
    expect(computeMultiAssetConsensusScore(publicData)).toBeCloseTo(0);
  });

  it('should return 0 for systematic disagreement (polarization)', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 100}),
        p2: createMockAnswer({assetB: 100}),
      },
    };
    // Alpha is ~-50, max(0, -50) = 0
    expect(computeMultiAssetConsensusScore(publicData)).toBe(0);
  });

  it('should return a correct partial consensus score', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 80, assetB: 20}),
        p2: createMockAnswer({assetA: 70, assetB: 30}),
        p3: createMockAnswer({assetA: 60, assetB: 40}),
      },
    };
    expect(computeMultiAssetConsensusScore(publicData)).toBeCloseTo(82.14);
  });
});
