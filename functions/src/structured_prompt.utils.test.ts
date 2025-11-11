import {
  UserType,
  ParticipantProfileExtended,
  MediatorProfileExtended,
  BasePromptConfig,
  PromptItemType,
} from '@deliberation-lab/utils';
import {getFirestoreDataForStructuredPrompt} from './structured_prompt.utils';
import * as firestoreUtils from './utils/firestore';

// Mock firestore utilities
jest.mock('./utils/firestore');
jest.mock('./app', () => ({
  stageManager: {
    resolveTemplateVariablesInStage: jest.fn((stage) => stage),
  },
}));

describe('structured_prompt.utils', () => {
  describe('getFirestoreDataForStructuredPrompt', () => {
    const mockExperimentId = 'test-experiment';
    const mockCohortId = 'test-cohort';
    const mockStageId = 'test-stage';

    const mockParticipant: ParticipantProfileExtended = {
      id: 'participant-1',
      privateId: 'participant-private-1',
      publicId: 'participant-public-1',
      type: UserType.PARTICIPANT,
      name: 'Test Participant',
      avatar: '🐶',
      pronouns: 'they/them',
      currentCohortId: mockCohortId,
      currentExperimentId: mockExperimentId,
      currentStageId: mockStageId,
      timestamps: {
        accountCreated: {seconds: 0, nanoseconds: 0},
        lastLogin: {seconds: 0, nanoseconds: 0},
      },
      agentConfig: null,
      prolificId: null,
      transferCohortId: null,
      variableMap: {},
    };

    const mockParticipant2: ParticipantProfileExtended = {
      ...mockParticipant,
      id: 'participant-2',
      privateId: 'participant-private-2',
      publicId: 'participant-public-2',
      name: 'Test Participant 2',
      avatar: '🐱',
    };

    const mockMediator: MediatorProfileExtended = {
      id: 'mediator-1',
      privateId: 'mediator-private-1',
      publicId: 'mediator-public-1',
      type: UserType.MEDIATOR,
      name: 'Test Mediator',
      avatar: '🤖',
      pronouns: 'they/them',
      currentCohortId: mockCohortId,
      currentExperimentId: mockExperimentId,
      currentStageId: mockStageId,
      timestamps: {
        accountCreated: {seconds: 0, nanoseconds: 0},
        lastLogin: {seconds: 0, nanoseconds: 0},
      },
      agentConfig: {
        agentId: 'test-agent',
        model: 'test-model',
        apiKey: 'test-key',
        promptContext: 'test context',
      },
      prolificId: null,
      transferCohortId: null,
      variableMap: {},
    };

    const mockExperiment = {
      id: mockExperimentId,
      versionId: 'v1',
      metadata: {
        name: 'Test Experiment',
        publicName: 'Test',
        description: '',
        tags: [],
        date: {seconds: 0, nanoseconds: 0},
      },
      permissions: {experimenters: [], viewers: []},
      stageIds: [mockStageId],
      prolific: {
        enableProlificIntegration: false,
        defaultRedirectCode: null,
        completionCodeMap: {},
      },
      attentionCheckConfig: {
        numFailed: 0,
      },
      variableMap: {},
      variableConfigs: [],
    };

    const mockCohort = {
      id: mockCohortId,
      name: 'Test Cohort',
      metadata: {
        numberOfParticipants: 2,
        publicName: null,
        description: null,
        date: {seconds: 0, nanoseconds: 0},
      },
      participantConfig: {
        allowedParticipantIds: [],
        disabledParticipantIds: [],
      },
      variableMap: {},
    };

    const mockPromptConfig: BasePromptConfig = {
      prompt: [
        {
          type: PromptItemType.TEXT,
          text: 'Test prompt',
        },
      ],
    };

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default mocks
      (firestoreUtils.getFirestoreExperiment as jest.Mock).mockResolvedValue(
        mockExperiment,
      );
      (firestoreUtils.getFirestoreCohort as jest.Mock).mockResolvedValue(
        mockCohort,
      );
      (
        firestoreUtils.getFirestoreActiveParticipants as jest.Mock
      ).mockResolvedValue([mockParticipant, mockParticipant2]);
      (firestoreUtils.getFirestoreParticipant as jest.Mock).mockImplementation(
        async (experimentId: string, participantId: string) => {
          if (participantId === 'participant-private-1') return mockParticipant;
          if (participantId === 'participant-private-2')
            return mockParticipant2;
          return undefined;
        },
      );
    });

    it('should use contextParticipantIds when provided', async () => {
      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockMediator,
        mockPromptConfig,
        ['participant-private-1'], // Only one participant
      );

      // Should fetch only the specified participant
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].privateId).toBe('participant-private-1');
      expect(firestoreUtils.getFirestoreParticipant).toHaveBeenCalledWith(
        mockExperimentId,
        'participant-private-1',
      );
    });

    it('should fetch multiple participants when multiple contextParticipantIds provided', async () => {
      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockMediator,
        mockPromptConfig,
        ['participant-private-1', 'participant-private-2'],
      );

      // Should fetch both specified participants
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].privateId).toBe('participant-private-1');
      expect(result.participants[1].privateId).toBe('participant-private-2');
    });

    it('should use only participant own context when no contextParticipantIds and user is participant', async () => {
      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        mockPromptConfig,
        undefined, // No contextParticipantIds
      );

      // Should fetch only the participant's own data
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].privateId).toBe('participant-private-1');
      expect(firestoreUtils.getFirestoreParticipant).toHaveBeenCalledWith(
        mockExperimentId,
        'participant-private-1',
      );
    });

    it('should use all active participants when no contextParticipantIds and user is mediator', async () => {
      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockMediator,
        mockPromptConfig,
        undefined, // No contextParticipantIds
      );

      // Should use all active participants
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0].privateId).toBe('participant-private-1');
      expect(result.participants[1].privateId).toBe('participant-private-2');
    });

    it('should prioritize contextParticipantIds over user type logic', async () => {
      // Even though mediator would normally get all participants,
      // contextParticipantIds should override this
      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockMediator,
        mockPromptConfig,
        ['participant-private-2'], // Only one specific participant
      );

      // Should only get the specified participant, not all participants
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].privateId).toBe('participant-private-2');
    });

    it('should handle empty contextParticipantIds array by falling back to default behavior', async () => {
      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockMediator,
        mockPromptConfig,
        [], // Empty array
      );

      // Should fall back to default mediator behavior (all participants)
      expect(result.participants).toHaveLength(2);
    });
  });
});
