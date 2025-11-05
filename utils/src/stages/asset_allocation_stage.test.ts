import {
  MultiAssetAllocationStagePublicData,
  MultiAssetAllocationStageParticipantAnswer,
  computeMultiAssetConsensusScore,
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

describe('computeMultiAssetConsensusScore', () => {
  it('should return 0 if publicData is undefined', () => {
    expect(computeMultiAssetConsensusScore(undefined)).toBe(0);
  });

  it('should return 0 if participantAnswerMap is empty', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {},
    };
    expect(computeMultiAssetConsensusScore(publicData)).toBe(0);
  });

  it('should calculate the correct average score for multiple participants', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 70, assetB: 30}),
        p2: createMockAnswer({assetA: 50, assetB: 50}),
      },
    };

    // Calculation:
    // Asset A average: (70 + 50) / 2 = 60
    // Asset B average: (30 + 50) / 2 = 40
    // Total average: (60 + 40) / 2 = 50
    expect(computeMultiAssetConsensusScore(publicData)).toBe(50);
  });

  it('should treat missing allocations as 0', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        // p1 allocated to both assets
        p1: createMockAnswer({assetA: 80, assetB: 20}),
        // p2 only allocated to assetA. assetB is missing.
        p2: createMockAnswer({assetA: 40}),
      },
    };

    // Calculation:
    // The function derives asset IDs from the first participant ('assetA', 'assetB')
    // Asset A average: (80 + 40) / 2 = 60
    // Asset B average: (20 + 0) / 2 = 10 (p2's missing allocation is treated as 0)
    // Total average: (60 + 10) / 2 = 35
    expect(computeMultiAssetConsensusScore(publicData)).toBe(35);
  });

  it('should handle a single participant correctly', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({assetA: 60, assetB: 20, assetC: 20}),
      },
    };

    // Calculation:
    // Asset A average: 60 / 1 = 60
    // Asset B average: 20 / 1 = 20
    // Asset C average: 20 / 1 = 20
    // Total average: (60 + 20 + 20) / 3 = 33.333...
    expect(computeMultiAssetConsensusScore(publicData)).toBeCloseTo(33.333);
  });

  it('should return 0 if the first participant has no allocations', () => {
    const publicData: MultiAssetAllocationStagePublicData = {
      id: 'test-stage',
      kind: 'multi-asset-allocation',
      participantAnswerMap: {
        p1: createMockAnswer({}), // No allocations
        p2: createMockAnswer({assetA: 100}),
      },
    };

    // The function gets assetIds from p1, which is empty, so it returns 0.
    expect(computeMultiAssetConsensusScore(publicData)).toBe(0);
  });
});
