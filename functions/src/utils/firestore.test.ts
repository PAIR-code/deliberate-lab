/**
 * Tests for firestore utility functions
 *
 * These tests verify that getFirestoreActiveParticipants correctly filters
 * participants by status, cohort, stage, and agent status.
 */

import {
  ParticipantProfileExtended,
  ParticipantStatus,
  UserType,
} from '@deliberation-lab/utils';

// Mock the app module before importing the function under test
const mockGet = jest.fn();
const mockWhere = jest.fn(() => ({
  where: mockWhere,
  get: mockGet,
}));
const mockCollection = jest.fn(() => ({
  doc: jest.fn(() => ({
    collection: mockCollection,
  })),
  where: mockWhere,
}));

jest.mock('../app', () => ({
  app: {
    firestore: () => ({
      collection: mockCollection,
    }),
  },
}));

import {getFirestoreActiveParticipants} from './firestore';

describe('getFirestoreActiveParticipants', () => {
  const experimentId = 'test-experiment';
  const cohortId = 'test-cohort';
  const stageId = 'test-stage';

  // Helper to create mock participant
  const createMockParticipant = (
    overrides: Partial<ParticipantProfileExtended> = {},
  ): ParticipantProfileExtended => ({
    id: 'participant-1',
    privateId: 'private-1',
    publicId: 'public-1',
    type: UserType.PARTICIPANT,
    name: 'Test Participant',
    avatar: '🐶',
    pronouns: 'they/them',
    currentCohortId: cohortId,
    currentExperimentId: experimentId,
    currentStageId: stageId,
    currentStatus: ParticipantStatus.IN_PROGRESS,
    timestamps: {
      accountCreated: {seconds: 0, nanoseconds: 0},
      lastLogin: {seconds: 0, nanoseconds: 0},
      startExperiment: {seconds: 0, nanoseconds: 0},
      readyStages: {},
      completedStages: {},
    },
    agentConfig: null,
    prolificId: null,
    transferCohortId: null,
    variableMap: {},
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Firestore query parameters', () => {
    it('should query by cohortId and status', async () => {
      mockGet.mockResolvedValue({docs: []});

      await getFirestoreActiveParticipants(experimentId, cohortId);

      // Verify the collection path
      expect(mockCollection).toHaveBeenCalledWith('experiments');

      // Verify where clauses are called with correct parameters
      const whereCalls = mockWhere.mock.calls;
      expect(whereCalls).toContainEqual(['currentCohortId', '==', cohortId]);
      expect(whereCalls).toContainEqual([
        'currentStatus',
        'in',
        [
          ParticipantStatus.IN_PROGRESS,
          ParticipantStatus.SUCCESS,
          ParticipantStatus.ATTENTION_CHECK,
        ],
      ]);
    });
  });

  describe('filtering behavior', () => {
    it('should return participants with IN_PROGRESS status', async () => {
      const participant = createMockParticipant({
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });
      mockGet.mockResolvedValue({
        docs: [{data: () => participant}],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].privateId).toBe('private-1');
    });

    it('should return participants with SUCCESS status', async () => {
      const participant = createMockParticipant({
        currentStatus: ParticipantStatus.SUCCESS,
      });
      mockGet.mockResolvedValue({
        docs: [{data: () => participant}],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
      );

      expect(result).toHaveLength(1);
    });

    it('should return participants with ATTENTION_CHECK status', async () => {
      const participant = createMockParticipant({
        currentStatus: ParticipantStatus.ATTENTION_CHECK,
      });
      mockGet.mockResolvedValue({
        docs: [{data: () => participant}],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
      );

      expect(result).toHaveLength(1);
    });

    it('should filter by stageId when provided', async () => {
      const participantInStage = createMockParticipant({
        privateId: 'in-stage',
        currentStageId: stageId,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });
      const participantOtherStage = createMockParticipant({
        privateId: 'other-stage',
        currentStageId: 'different-stage',
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });
      mockGet.mockResolvedValue({
        docs: [
          {data: () => participantInStage},
          {data: () => participantOtherStage},
        ],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        stageId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].privateId).toBe('in-stage');
    });

    it('should return all stages when stageId is null', async () => {
      const participant1 = createMockParticipant({
        privateId: 'p1',
        currentStageId: 'stage-1',
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });
      const participant2 = createMockParticipant({
        privateId: 'p2',
        currentStageId: 'stage-2',
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });
      mockGet.mockResolvedValue({
        docs: [{data: () => participant1}, {data: () => participant2}],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        null,
      );

      expect(result).toHaveLength(2);
    });

    it('should filter for agents when checkIsAgent is true', async () => {
      const agentParticipant = createMockParticipant({
        privateId: 'agent',
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: {
          agentId: 'test-agent',
          model: 'test-model',
          apiKey: 'test-key',
          promptContext: 'test context',
        },
      });
      const humanParticipant = createMockParticipant({
        privateId: 'human',
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: null,
      });
      mockGet.mockResolvedValue({
        docs: [{data: () => agentParticipant}, {data: () => humanParticipant}],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        null,
        true, // checkIsAgent
      );

      expect(result).toHaveLength(1);
      expect(result[0].privateId).toBe('agent');
    });

    it('should return all participants when checkIsAgent is false', async () => {
      const agentParticipant = createMockParticipant({
        privateId: 'agent',
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: {
          agentId: 'test-agent',
          model: 'test-model',
          apiKey: 'test-key',
          promptContext: 'test context',
        },
      });
      const humanParticipant = createMockParticipant({
        privateId: 'human',
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: null,
      });
      mockGet.mockResolvedValue({
        docs: [{data: () => agentParticipant}, {data: () => humanParticipant}],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        null,
        false,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('combined filtering', () => {
    it('should correctly filter by stageId AND agent status', async () => {
      const agentInStage = createMockParticipant({
        privateId: 'agent-in-stage',
        currentStageId: stageId,
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: {
          agentId: 'test-agent',
          model: 'test-model',
          apiKey: 'test-key',
          promptContext: 'test context',
        },
      });
      const agentOtherStage = createMockParticipant({
        privateId: 'agent-other-stage',
        currentStageId: 'other-stage',
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: {
          agentId: 'test-agent',
          model: 'test-model',
          apiKey: 'test-key',
          promptContext: 'test context',
        },
      });
      const humanInStage = createMockParticipant({
        privateId: 'human-in-stage',
        currentStageId: stageId,
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: null,
      });
      mockGet.mockResolvedValue({
        docs: [
          {data: () => agentInStage},
          {data: () => agentOtherStage},
          {data: () => humanInStage},
        ],
      });

      const result = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        stageId,
        true, // checkIsAgent
      );

      expect(result).toHaveLength(1);
      expect(result[0].privateId).toBe('agent-in-stage');
    });
  });
});
