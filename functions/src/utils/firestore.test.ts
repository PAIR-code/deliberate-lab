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

    it('should query by stageId when provided', async () => {
      mockGet.mockResolvedValue({docs: []});

      await getFirestoreActiveParticipants(experimentId, cohortId, stageId);

      // Verify stageId where clause is added
      const whereCalls = mockWhere.mock.calls;
      expect(whereCalls).toContainEqual(['currentStageId', '==', stageId]);
    });

    it('should not query by stageId when null', async () => {
      mockGet.mockResolvedValue({docs: []});

      await getFirestoreActiveParticipants(experimentId, cohortId, null);

      // Verify stageId where clause is NOT added
      const whereCalls = mockWhere.mock.calls;
      const stageIdCalls = whereCalls.filter(
        (call) => call[0] === 'currentStageId',
      );
      expect(stageIdCalls).toHaveLength(0);
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

    it('should return only participants matching stageId (filtered by Firestore)', async () => {
      // stageId filtering is done by Firestore - mock simulates Firestore's filtered response
      const participantA = createMockParticipant({
        privateId: 'participant-A',
        currentStageId: stageId,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });
      const participantB = createMockParticipant({
        privateId: 'participant-B',
        currentStageId: 'other-stage',
        currentStatus: ParticipantStatus.IN_PROGRESS,
      });

      // First call: query for stageId - Firestore returns only participantA
      mockGet.mockResolvedValue({
        docs: [{data: () => participantA}],
      });

      const result1 = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        stageId,
      );

      expect(result1).toHaveLength(1);
      expect(result1[0].privateId).toBe('participant-A');
      expect(mockWhere).toHaveBeenCalledWith('currentStageId', '==', stageId);

      // Reset mocks for second call
      jest.clearAllMocks();

      // Second call: query for 'other-stage' - Firestore returns only participantB
      mockGet.mockResolvedValue({
        docs: [{data: () => participantB}],
      });

      const result2 = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        'other-stage',
      );

      expect(result2).toHaveLength(1);
      expect(result2[0].privateId).toBe('participant-B');
      expect(mockWhere).toHaveBeenCalledWith(
        'currentStageId',
        '==',
        'other-stage',
      );
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
    it('should filter by checkIsAgent in JS after Firestore filters by stageId', async () => {
      // Four participants: 2 agents (different stages), 2 humans (different stages)
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
      const humanOtherStage = createMockParticipant({
        privateId: 'human-other-stage',
        currentStageId: 'other-stage',
        currentStatus: ParticipantStatus.IN_PROGRESS,
        agentConfig: null,
      });

      // Query 1: stageId + checkIsAgent=true
      // Firestore returns participants in stageId (agentInStage, humanInStage)
      // JS filters for agents only → agentInStage
      mockGet.mockResolvedValue({
        docs: [{data: () => agentInStage}, {data: () => humanInStage}],
      });

      const result1 = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        stageId,
        true, // checkIsAgent
      );

      expect(result1).toHaveLength(1);
      expect(result1[0].privateId).toBe('agent-in-stage');
      expect(mockWhere).toHaveBeenCalledWith('currentStageId', '==', stageId);

      jest.clearAllMocks();

      // Query 2: 'other-stage' + checkIsAgent=true
      // Firestore returns participants in other-stage (agentOtherStage, humanOtherStage)
      // JS filters for agents only → agentOtherStage
      mockGet.mockResolvedValue({
        docs: [{data: () => agentOtherStage}, {data: () => humanOtherStage}],
      });

      const result2 = await getFirestoreActiveParticipants(
        experimentId,
        cohortId,
        'other-stage',
        true, // checkIsAgent
      );

      expect(result2).toHaveLength(1);
      expect(result2[0].privateId).toBe('agent-other-stage');
      expect(mockWhere).toHaveBeenCalledWith(
        'currentStageId',
        '==',
        'other-stage',
      );
    });
  });
});
