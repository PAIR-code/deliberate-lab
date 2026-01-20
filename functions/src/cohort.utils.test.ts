/**
 * Tests for cohort utility functions
 *
 * These tests verify that markCohortParticipantsAsDeleted correctly
 * queries and updates participants by cohortId.
 */

import {ParticipantStatus} from '@deliberation-lab/utils';

// Track mock calls
const mockWhere = jest.fn();
const mockGet = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

// Mock the app module
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
