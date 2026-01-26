import {
  ParticipantProfile,
  ParticipantStatus,
  ProgressTimestamps,
  UserType,
} from '@deliberation-lab/utils';
import {sortParticipants, SortParticipantsOptions} from './participant.utils';

describe('sortParticipants', () => {
  const stageIds = ['stage-1', 'stage-2', 'stage-3'];

  // Helper to create mock participant (same pattern as firestore.test.ts)
  const createMockParticipant = (
    overrides: Partial<ParticipantProfile> = {},
  ): ParticipantProfile =>
    ({
      type: UserType.PARTICIPANT,
      pronouns: null,
      avatar: null,
      name: null,
      publicId: 'test-participant',
      prolificId: null,
      currentStageId: 'stage-1',
      currentCohortId: 'cohort-1',
      transferCohortId: null,
      currentStatus: ParticipantStatus.IN_PROGRESS,
      timestamps: {
        acceptedTOS: null,
        startExperiment: {seconds: 0, nanoseconds: 0},
        endExperiment: null,
        completedStages: {},
        readyStages: {},
        cohortTransfers: {},
      },
      anonymousProfiles: {},
      connected: true,
      ...overrides,
    }) as ParticipantProfile;

  describe('sorting by name', () => {
    it('sorts participants by name ascending', () => {
      const participants = [
        createMockParticipant({publicId: 'p1', name: 'Charlie'}),
        createMockParticipant({publicId: 'p2', name: 'Alice'}),
        createMockParticipant({publicId: 'p3', name: 'Bob'}),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'name',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts participants by name descending', () => {
      const participants = [
        createMockParticipant({publicId: 'p1', name: 'Alice'}),
        createMockParticipant({publicId: 'p2', name: 'Charlie'}),
        createMockParticipant({publicId: 'p3', name: 'Bob'}),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'name',
        sortDirection: 'desc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('falls back to publicId when name is null', () => {
      const participants = [
        createMockParticipant({publicId: 'zebra-1'}),
        createMockParticipant({publicId: 'apple-1'}),
        createMockParticipant({publicId: 'mango-1', name: 'Bob'}),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'name',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.publicId)).toEqual([
        'apple-1',
        'mango-1',
        'zebra-1',
      ]);
    });

    it('handles case-insensitive sorting', () => {
      const participants = [
        createMockParticipant({publicId: 'p1', name: 'bob'}),
        createMockParticipant({publicId: 'p2', name: 'Alice'}),
        createMockParticipant({publicId: 'p3', name: 'CHARLIE'}),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'name',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual(['Alice', 'bob', 'CHARLIE']);
    });
  });

  describe('sorting by lastActive', () => {
    it('sorts participants by last active time ascending', () => {
      const participants = [
        createMockParticipant({
          publicId: 'p1',
          name: 'Late',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 3000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'p2',
          name: 'Early',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 1000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'p3',
          name: 'Middle',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 2000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'lastActive',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual(['Early', 'Middle', 'Late']);
    });

    it('sorts participants by last active time descending', () => {
      const participants = [
        createMockParticipant({
          publicId: 'p1',
          name: 'Early',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 1000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'p2',
          name: 'Late',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 3000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'lastActive',
        sortDirection: 'desc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual(['Late', 'Early']);
    });

    it('uses completed stage timestamp for participants on later stages', () => {
      const participants = [
        createMockParticipant({
          publicId: 'p1',
          name: 'OnStage2',
          currentStageId: 'stage-2',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 1000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {'stage-1': {seconds: 3000, nanoseconds: 0}},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'p2',
          name: 'OnStage1',
          currentStageId: 'stage-1',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 2000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'lastActive',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      // OnStage1 started at 2000, OnStage2 completed stage-1 at 3000
      expect(sorted.map((p) => p.name)).toEqual(['OnStage1', 'OnStage2']);
    });
  });

  describe('transfer stage priority', () => {
    it('puts participants ready for transfer at the top', () => {
      const participants = [
        createMockParticipant({
          publicId: 'p1',
          name: 'NotOnTransfer',
          currentStageId: 'stage-1',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 1000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'p2',
          name: 'OnTransfer',
          currentStageId: 'transfer-stage',
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 2000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
      ];

      const isOnTransferStage = (p: ParticipantProfile) =>
        p.currentStageId === 'transfer-stage';

      const options: SortParticipantsOptions = {
        sortBy: 'lastActive',
        sortDirection: 'asc',
        stageIds,
        isOnTransferStage,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual([
        'OnTransfer',
        'NotOnTransfer',
      ]);
    });
  });

  describe('transfer timeout handling', () => {
    it('puts transfer timeout participants at the bottom', () => {
      const participants = [
        createMockParticipant({
          publicId: 'p1',
          name: 'TimedOut',
          currentStatus: ParticipantStatus.TRANSFER_TIMEOUT,
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 1000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'p2',
          name: 'Active',
          currentStatus: ParticipantStatus.IN_PROGRESS,
          timestamps: {
            acceptedTOS: null,
            startExperiment: {seconds: 2000, nanoseconds: 0},
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'lastActive',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.name)).toEqual(['Active', 'TimedOut']);
    });
  });

  describe('fallback behavior', () => {
    it('falls back to publicId when timestamps are missing', () => {
      const participants = [
        createMockParticipant({
          publicId: 'zebra-1',
          name: 'Zebra',
          timestamps: {
            acceptedTOS: null,
            startExperiment: null,
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
        createMockParticipant({
          publicId: 'apple-1',
          name: 'Apple',
          timestamps: {
            acceptedTOS: null,
            startExperiment: null,
            endExperiment: null,
            completedStages: {},
            readyStages: {},
            cohortTransfers: {},
          } as unknown as ProgressTimestamps,
        }),
      ];

      const options: SortParticipantsOptions = {
        sortBy: 'lastActive',
        sortDirection: 'asc',
        stageIds,
      };

      const sorted = sortParticipants(participants, options);

      expect(sorted.map((p) => p.publicId)).toEqual(['apple-1', 'zebra-1']);
    });
  });

  describe('immutability', () => {
    it('does not modify the original array', () => {
      const participants = [
        createMockParticipant({publicId: 'p1', name: 'Charlie'}),
        createMockParticipant({publicId: 'p2', name: 'Alice'}),
      ];
      const originalOrder = [...participants];

      const options: SortParticipantsOptions = {
        sortBy: 'name',
        sortDirection: 'asc',
        stageIds,
      };

      sortParticipants(participants, options);

      expect(participants).toEqual(originalOrder);
    });
  });
});
