/**
 * Tests for cohort utility functions.
 *
 * Unit tests for transformCohortValuesKeys (no Firestore needed).
 * Tests for markCohortParticipantsAsDeleted use Jest mocks.
 */

import {
  createStaticVariableConfig,
  createRandomPermutationVariableConfig,
  VariableScope,
  VariableType,
  VariableConfigType,
  SeedStrategy,
  ParticipantStatus,
} from '@deliberation-lab/utils';
import {transformCohortValuesKeys} from './cohort.utils';

describe('transformCohortValuesKeys', () => {
  it('should transform alias key to cohortId for matching static variable', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
          'arm-skeptic': JSON.stringify('skeptic'),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(VariableConfigType.STATIC);
    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].cohortValues).toEqual({
        'cohort-123': JSON.stringify('pro_ai'),
      });
    }
  });

  it('should not modify config when alias not in cohortValues', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-other',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(configs[0]); // Same reference, not modified
  });

  it('should not modify config when cohortValues not present', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        // No cohortValues
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(configs[0]); // Same reference, not modified
  });

  it('should not modify non-static variable configs', () => {
    const configs = [
      createRandomPermutationVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'items',
          description: 'Random items',
          schema: VariableType.array(VariableType.STRING),
        },
        values: [JSON.stringify('a'), JSON.stringify('b')],
        shuffleConfig: {
          shuffle: true,
          seed: SeedStrategy.COHORT,
          customSeed: '',
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(configs[0]); // Same reference, not modified
  });

  it('should transform multiple configs with matching aliases', () => {
    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
          'arm-skeptic': JSON.stringify('skeptic'),
        },
      }),
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'agent_name',
          description: 'Agent name',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('Default Agent'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('Pro-AI Agent'),
          'arm-skeptic': JSON.stringify('Skeptic Agent'),
        },
      }),
      createStaticVariableConfig({
        scope: VariableScope.EXPERIMENT,
        definition: {
          name: 'experiment_name',
          description: 'Experiment name',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('My Experiment'),
        // No cohortValues - experiment-level variable
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-xyz',
    );

    expect(result).toHaveLength(3);

    // First config transformed
    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].cohortValues).toEqual({
        'cohort-xyz': JSON.stringify('pro_ai'),
      });
    }

    // Second config transformed
    if (result[1].type === VariableConfigType.STATIC) {
      expect(result[1].cohortValues).toEqual({
        'cohort-xyz': JSON.stringify('Pro-AI Agent'),
      });
    }

    // Third config unchanged (no cohortValues)
    expect(result[2]).toBe(configs[2]);
  });

  it('should handle empty variable configs array', () => {
    const result = transformCohortValuesKeys([], 'arm-pro-ai', 'cohort-123');
    expect(result).toEqual([]);
  });

  it('should preserve other properties of static config when transforming', () => {
    const configs = [
      createStaticVariableConfig({
        id: 'var-1',
        scope: VariableScope.COHORT,
        definition: {
          name: 'treatment',
          description: 'Treatment condition',
          schema: VariableType.STRING,
        },
        value: JSON.stringify('control'),
        cohortValues: {
          'arm-pro-ai': JSON.stringify('pro_ai'),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    expect(result).toHaveLength(1);
    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].id).toBe('var-1');
      expect(result[0].scope).toBe(VariableScope.COHORT);
      expect(result[0].value).toBe(JSON.stringify('control'));
      expect(result[0].definition.name).toBe('treatment');
    }
  });

  it('should work with complex cohortValues containing objects', () => {
    const proAiPersona = {
      name: 'Pro-AI Agent',
      traits: ['enthusiastic', 'technical'],
      confidence: 0.9,
    };

    const configs = [
      createStaticVariableConfig({
        scope: VariableScope.COHORT,
        definition: {
          name: 'persona',
          description: 'Agent persona',
          schema: VariableType.object({
            name: VariableType.STRING,
            traits: VariableType.array(VariableType.STRING),
            confidence: VariableType.NUMBER,
          }),
        },
        value: JSON.stringify({name: 'Default', traits: [], confidence: 0.5}),
        cohortValues: {
          'arm-pro-ai': JSON.stringify(proAiPersona),
        },
      }),
    ];

    const result = transformCohortValuesKeys(
      configs,
      'arm-pro-ai',
      'cohort-123',
    );

    if (result[0].type === VariableConfigType.STATIC) {
      expect(result[0].cohortValues).toEqual({
        'cohort-123': JSON.stringify(proAiPersona),
      });
    }
  });
});

// =============================================================================
// Tests for markCohortParticipantsAsDeleted (requires Jest mocks)
// =============================================================================

// Track mock calls
const mockWhere = jest.fn();
const mockGet = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

// Mock the app module - must be before importing markCohortParticipantsAsDeleted
jest.mock('./app', () => {
  const createMockQuery = () => ({
    where: jest.fn((field, op, value) => {
      mockWhere(field, op, value);
      return {get: mockGet};
    }),
  });

  return {
    app: {
      firestore: () => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            collection: jest.fn(() => createMockQuery()),
          })),
        })),
        batch: jest.fn(() => ({
          set: mockBatchSet,
          commit: mockBatchCommit,
        })),
      }),
    },
  };
});

// Import after mock is defined
import {markCohortParticipantsAsDeleted} from './cohort.utils';

describe('markCohortParticipantsAsDeleted', () => {
  const experimentId = 'test-experiment';
  const cohortId = 'target-cohort';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Firestore query parameters', () => {
    it('should query by both currentCohortId and transferCohortId', async () => {
      mockGet.mockResolvedValue({docs: []});

      await markCohortParticipantsAsDeleted(experimentId, cohortId);

      // Verify both queries were made
      expect(mockWhere).toHaveBeenCalledWith('currentCohortId', '==', cohortId);
      expect(mockWhere).toHaveBeenCalledWith(
        'transferCohortId',
        '==',
        cohortId,
      );
      expect(mockWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('participant filtering behavior', () => {
    it('should update participant matching currentCohortId', async () => {
      const participantA = {
        privateId: 'participant-A',
        currentCohortId: cohortId,
        transferCohortId: null,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      };
      const mockRef = {id: 'participant-A'};
      const mockDoc = {
        id: 'participant-A',
        ref: mockRef,
        data: () => participantA,
      };

      mockGet
        .mockResolvedValueOnce({docs: [mockDoc]}) // currentCohortId query
        .mockResolvedValueOnce({docs: []}); // transferCohortId query

      const result = await markCohortParticipantsAsDeleted(
        experimentId,
        cohortId,
      );

      expect(result.updatedCount).toBe(1);
      expect(mockBatchSet).toHaveBeenCalledWith(mockRef, {
        ...participantA,
        currentStatus: ParticipantStatus.DELETED,
      });
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('should update participant matching transferCohortId', async () => {
      const participantB = {
        privateId: 'participant-B',
        currentCohortId: 'other-cohort',
        transferCohortId: cohortId,
        currentStatus: ParticipantStatus.TRANSFER_PENDING,
      };
      const mockRef = {id: 'participant-B'};
      const mockDoc = {
        id: 'participant-B',
        ref: mockRef,
        data: () => participantB,
      };

      mockGet
        .mockResolvedValueOnce({docs: []}) // currentCohortId query
        .mockResolvedValueOnce({docs: [mockDoc]}); // transferCohortId query

      const result = await markCohortParticipantsAsDeleted(
        experimentId,
        cohortId,
      );

      expect(result.updatedCount).toBe(1);
      expect(mockBatchSet).toHaveBeenCalledWith(mockRef, {
        ...participantB,
        currentStatus: ParticipantStatus.DELETED,
      });
    });

    it('should update participants from both queries', async () => {
      const participantA = {
        privateId: 'participant-A',
        currentCohortId: cohortId,
        transferCohortId: null,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      };
      const participantB = {
        privateId: 'participant-B',
        currentCohortId: 'other-cohort',
        transferCohortId: cohortId,
        currentStatus: ParticipantStatus.TRANSFER_PENDING,
      };

      const mockRefA = {id: 'participant-A'};
      const mockDocA = {
        id: 'participant-A',
        ref: mockRefA,
        data: () => participantA,
      };

      const mockRefB = {id: 'participant-B'};
      const mockDocB = {
        id: 'participant-B',
        ref: mockRefB,
        data: () => participantB,
      };

      mockGet
        .mockResolvedValueOnce({docs: [mockDocA]}) // currentCohortId query
        .mockResolvedValueOnce({docs: [mockDocB]}); // transferCohortId query

      const result = await markCohortParticipantsAsDeleted(
        experimentId,
        cohortId,
      );

      expect(result.updatedCount).toBe(2);
      expect(mockBatchSet).toHaveBeenCalledTimes(2);
      expect(mockBatchSet).toHaveBeenCalledWith(mockRefA, {
        ...participantA,
        currentStatus: ParticipantStatus.DELETED,
      });
      expect(mockBatchSet).toHaveBeenCalledWith(mockRefB, {
        ...participantB,
        currentStatus: ParticipantStatus.DELETED,
      });
    });

    it('should NOT update participants in other cohorts', async () => {
      // participant-C is in 'other-cohort' with no transfer to target-cohort
      // It should NOT be returned by either query
      mockGet
        .mockResolvedValueOnce({docs: []}) // currentCohortId query returns empty
        .mockResolvedValueOnce({docs: []}); // transferCohortId query returns empty

      const result = await markCohortParticipantsAsDeleted(
        experimentId,
        cohortId,
      );

      expect(result.updatedCount).toBe(0);
      expect(mockBatchSet).not.toHaveBeenCalled();
    });

    it('should deduplicate participants matching both queries', async () => {
      // Edge case: participant matches both currentCohortId AND transferCohortId
      const participantD = {
        privateId: 'participant-D',
        currentCohortId: cohortId,
        transferCohortId: cohortId, // Same cohort for both
        currentStatus: ParticipantStatus.IN_PROGRESS,
      };
      const mockRef = {id: 'participant-D'};
      const mockDoc = {
        id: 'participant-D',
        ref: mockRef,
        data: () => participantD,
      };

      // Both queries return the same participant
      mockGet
        .mockResolvedValueOnce({docs: [mockDoc]}) // currentCohortId query
        .mockResolvedValueOnce({docs: [mockDoc]}); // transferCohortId query

      const result = await markCohortParticipantsAsDeleted(
        experimentId,
        cohortId,
      );

      // Should only update once due to Map deduplication
      expect(result.updatedCount).toBe(1);
      expect(mockBatchSet).toHaveBeenCalledTimes(1);
    });
  });

  describe('batch operations', () => {
    it('should use single batch commit for multiple participants', async () => {
      const participants = [
        {
          privateId: 'p1',
          currentCohortId: cohortId,
          currentStatus: ParticipantStatus.IN_PROGRESS,
        },
        {
          privateId: 'p2',
          currentCohortId: cohortId,
          currentStatus: ParticipantStatus.IN_PROGRESS,
        },
        {
          privateId: 'p3',
          currentCohortId: cohortId,
          currentStatus: ParticipantStatus.IN_PROGRESS,
        },
      ];

      const mockDocs = participants.map((p) => ({
        id: p.privateId,
        ref: {id: p.privateId},
        data: () => p,
      }));

      mockGet
        .mockResolvedValueOnce({docs: mockDocs})
        .mockResolvedValueOnce({docs: []});

      await markCohortParticipantsAsDeleted(experimentId, cohortId);

      // Should have 3 batch.set calls but only 1 batch.commit
      expect(mockBatchSet).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * Behavioral equivalence documentation
 *
 * Old implementation (cohort.endpoints.ts):
 * - Fetched ALL participants in experiment (no filter)
 * - Filtered in JS: currentCohortId === cohortId || transferCohortId === cohortId
 * - Individual transaction per matching participant
 *
 * New implementation (cohort.utils.ts):
 * - Two Firestore queries with filters:
 *   - where('currentCohortId', '==', cohortId)
 *   - where('transferCohortId', '==', cohortId)
 * - Combines results using Map (deduplicates)
 * - Single batch write
 *
 * Expected behavior (same for both):
 * - participant-A (currentCohortId=target): DELETED
 * - participant-B (transferCohortId=target): DELETED
 * - participant-C (other cohort, no transfer): NOT modified
 * - participant-D (both fields=target): DELETED once (not twice)
 */
