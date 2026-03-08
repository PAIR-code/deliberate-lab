import {
  UserType,
  ParticipantProfileExtended,
  MediatorProfileExtended,
  BasePromptConfig,
  PromptItemType,
  PromptItemGroup,
  TextPromptItem,
  StageKind,
  SurveyQuestionKind,
  createComparisonCondition,
  createConditionGroup,
  createAggregationCondition,
  ConditionOperator,
  ComparisonOperator,
  AggregationOperator,
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

  describe('condition filtering', () => {
    const mockExperimentId = 'test-experiment';
    const mockCohortId = 'test-cohort';
    const mockStageId = 'chat-stage';
    const mockSurveyStageId = 'survey-stage';

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

    const mockParticipant3: ParticipantProfileExtended = {
      ...mockParticipant,
      id: 'participant-3',
      privateId: 'participant-private-3',
      publicId: 'participant-public-3',
      name: 'Test Participant 3',
      avatar: '🐰',
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
      stageIds: [mockSurveyStageId, mockStageId],
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
        numberOfParticipants: 3,
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

    const mockSurveyStage = {
      id: mockSurveyStageId,
      kind: StageKind.SURVEY,
      name: 'Survey',
      descriptions: {primaryText: '', infoText: '', helpText: ''},
      questions: [{id: 'q1', kind: SurveyQuestionKind.SCALE}],
    };

    beforeEach(() => {
      jest.clearAllMocks();

      (firestoreUtils.getFirestoreExperiment as jest.Mock).mockResolvedValue(
        mockExperiment,
      );
      (firestoreUtils.getFirestoreCohort as jest.Mock).mockResolvedValue(
        mockCohort,
      );
      (
        firestoreUtils.getFirestoreActiveParticipants as jest.Mock
      ).mockResolvedValue([
        mockParticipant,
        mockParticipant2,
        mockParticipant3,
      ]);
      (firestoreUtils.getFirestoreParticipant as jest.Mock).mockImplementation(
        async (experimentId: string, participantId: string) => {
          if (participantId === 'participant-private-1') return mockParticipant;
          if (participantId === 'participant-private-2')
            return mockParticipant2;
          if (participantId === 'participant-private-3')
            return mockParticipant3;
          return undefined;
        },
      );
      (firestoreUtils.getFirestoreStage as jest.Mock).mockImplementation(
        async (experimentId: string, stageId: string) => {
          if (stageId === mockSurveyStageId) return mockSurveyStage;
          return undefined;
        },
      );
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([]);
    });

    it('should return all items when no conditions are present', async () => {
      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [
          {type: PromptItemType.TEXT, text: 'Item 1'},
          {type: PromptItemType.TEXT, text: 'Item 2'},
          {type: PromptItemType.TEXT, text: 'Item 3'},
        ],
      };

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      expect(result.filteredPromptItems).toHaveLength(3);
    });

    it('should filter out items with failing conditions', async () => {
      // Mock survey answers where participant answered 3
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([
        {
          participantPublicId: 'participant-public-1',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {
              q1: {kind: SurveyQuestionKind.SCALE, value: 3},
            },
          },
        },
      ]);

      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [
          {type: PromptItemType.TEXT, text: 'Always shown'},
          {
            type: PromptItemType.TEXT,
            text: 'Show if q1 > 5',
            condition: createComparisonCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              ComparisonOperator.GREATER_THAN,
              5,
            ),
          },
          {
            type: PromptItemType.TEXT,
            text: 'Show if q1 < 5',
            condition: createComparisonCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              ComparisonOperator.LESS_THAN,
              5,
            ),
          },
        ],
      };

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      // Should have 2 items: "Always shown" and "Show if q1 < 5"
      expect(result.filteredPromptItems).toHaveLength(2);
      expect(
        result.filteredPromptItems.map((item) =>
          item.type === PromptItemType.TEXT ? item.text : null,
        ),
      ).toEqual(['Always shown', 'Show if q1 < 5']);
    });

    it('should filter nested GROUP items recursively', async () => {
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([
        {
          participantPublicId: 'participant-public-1',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {
              q1: {kind: SurveyQuestionKind.SCALE, value: 7},
            },
          },
        },
      ]);

      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [
          {
            type: PromptItemType.GROUP,
            items: [
              {type: PromptItemType.TEXT, text: 'Group item 1'},
              {
                type: PromptItemType.TEXT,
                text: 'Group item 2 - conditional',
                condition: createComparisonCondition(
                  {stageId: mockSurveyStageId, questionId: 'q1'},
                  ComparisonOperator.LESS_THAN,
                  5, // Fails: 7 is not < 5
                ),
              },
              {type: PromptItemType.TEXT, text: 'Group item 3'},
            ],
          },
        ],
      };

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      // GROUP should be present with filtered children
      expect(result.filteredPromptItems).toHaveLength(1);
      const group = result.filteredPromptItems[0] as PromptItemGroup;
      expect(group.type).toBe(PromptItemType.GROUP);
      expect(group.items).toHaveLength(2);
      expect(group.items.map((item) => (item as TextPromptItem).text)).toEqual([
        'Group item 1',
        'Group item 3',
      ]);
    });

    it('should filter out entire GROUP when GROUP condition fails', async () => {
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([
        {
          participantPublicId: 'participant-public-1',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {
              q1: {kind: SurveyQuestionKind.SCALE, value: 3},
            },
          },
        },
      ]);

      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [
          {type: PromptItemType.TEXT, text: 'Before group'},
          {
            type: PromptItemType.GROUP,
            condition: createComparisonCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              ComparisonOperator.GREATER_THAN,
              5, // Fails: 3 is not > 5
            ),
            items: [
              {type: PromptItemType.TEXT, text: 'Group item 1'},
              {type: PromptItemType.TEXT, text: 'Group item 2'},
            ],
          },
          {type: PromptItemType.TEXT, text: 'After group'},
        ],
      };

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      // GROUP should be filtered out entirely
      expect(result.filteredPromptItems).toHaveLength(2);
      expect(
        result.filteredPromptItems.map((item) =>
          item.type === PromptItemType.TEXT ? item.text : 'GROUP',
        ),
      ).toEqual(['Before group', 'After group']);
    });

    it('should support condition groups with AND operator', async () => {
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([
        {
          participantPublicId: 'participant-public-1',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {
              q1: {kind: SurveyQuestionKind.SCALE, value: 7},
            },
          },
        },
      ]);

      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [
          {
            type: PromptItemType.TEXT,
            text: 'Show if 5 < q1 < 10',
            condition: createConditionGroup(ConditionOperator.AND, [
              createComparisonCondition(
                {stageId: mockSurveyStageId, questionId: 'q1'},
                ComparisonOperator.GREATER_THAN,
                5,
              ),
              createComparisonCondition(
                {stageId: mockSurveyStageId, questionId: 'q1'},
                ComparisonOperator.LESS_THAN,
                10,
              ),
            ]),
          },
          {
            type: PromptItemType.TEXT,
            text: 'Show if q1 > 10 AND q1 < 5 (impossible)',
            condition: createConditionGroup(ConditionOperator.AND, [
              createComparisonCondition(
                {stageId: mockSurveyStageId, questionId: 'q1'},
                ComparisonOperator.GREATER_THAN,
                10,
              ),
              createComparisonCondition(
                {stageId: mockSurveyStageId, questionId: 'q1'},
                ComparisonOperator.LESS_THAN,
                5,
              ),
            ]),
          },
        ],
      };

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      expect(result.filteredPromptItems).toHaveLength(1);
      expect((result.filteredPromptItems[0] as TextPromptItem).text).toBe(
        'Show if 5 < q1 < 10',
      );
    });

    it('should support aggregation conditions with ANY operator in group chat', async () => {
      // Three participants: one answered 8, one answered 3, one answered 6
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([
        {
          participantPublicId: 'participant-public-1',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {q1: {kind: SurveyQuestionKind.SCALE, value: 8}},
          },
        },
        {
          participantPublicId: 'participant-public-2',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {q1: {kind: SurveyQuestionKind.SCALE, value: 3}},
          },
        },
        {
          participantPublicId: 'participant-public-3',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {q1: {kind: SurveyQuestionKind.SCALE, value: 6}},
          },
        },
      ]);

      const promptConfig: BasePromptConfig = {
        type: StageKind.CHAT, // Group chat
        prompt: [
          {
            type: PromptItemType.TEXT,
            text: 'Show if ANY participant answered > 7',
            condition: createAggregationCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              AggregationOperator.ANY,
              ComparisonOperator.GREATER_THAN,
              7,
            ),
          },
          {
            type: PromptItemType.TEXT,
            text: 'Show if ALL participants answered > 7',
            condition: createAggregationCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              AggregationOperator.ALL,
              ComparisonOperator.GREATER_THAN,
              7,
            ),
          },
        ],
      };

      const mediator: MediatorProfileExtended = {
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

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mediator,
        promptConfig,
      );

      // ANY > 7 passes (participant 1 has 8), ALL > 7 fails
      expect(result.filteredPromptItems).toHaveLength(1);
      expect((result.filteredPromptItems[0] as TextPromptItem).text).toBe(
        'Show if ANY participant answered > 7',
      );
    });

    it('should support aggregation conditions with COUNT operator', async () => {
      // Three participants: values 8, 3, 6
      (
        firestoreUtils.getFirestoreAnswersForStage as jest.Mock
      ).mockResolvedValue([
        {
          participantPublicId: 'participant-public-1',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {q1: {kind: SurveyQuestionKind.SCALE, value: 8}},
          },
        },
        {
          participantPublicId: 'participant-public-2',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {q1: {kind: SurveyQuestionKind.SCALE, value: 3}},
          },
        },
        {
          participantPublicId: 'participant-public-3',
          answer: {
            kind: StageKind.SURVEY,
            answerMap: {q1: {kind: SurveyQuestionKind.SCALE, value: 6}},
          },
        },
      ]);

      const promptConfig: BasePromptConfig = {
        type: StageKind.CHAT,
        prompt: [
          {
            type: PromptItemType.TEXT,
            text: 'Show if COUNT of answers > 5 is >= 2',
            condition: createAggregationCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              AggregationOperator.COUNT,
              ComparisonOperator.GREATER_THAN_OR_EQUAL,
              2,
              {operator: ComparisonOperator.GREATER_THAN, value: 5}, // filterComparison
            ),
          },
          {
            type: PromptItemType.TEXT,
            text: 'Show if COUNT of answers > 5 is >= 3',
            condition: createAggregationCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              AggregationOperator.COUNT,
              ComparisonOperator.GREATER_THAN_OR_EQUAL,
              3,
              {operator: ComparisonOperator.GREATER_THAN, value: 5},
            ),
          },
        ],
      };

      const mediator: MediatorProfileExtended = {
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

      const result = await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mediator,
        promptConfig,
      );

      // Values > 5: [8, 6] = 2 items
      // COUNT >= 2: passes
      // COUNT >= 3: fails
      expect(result.filteredPromptItems).toHaveLength(1);
      expect((result.filteredPromptItems[0] as TextPromptItem).text).toBe(
        'Show if COUNT of answers > 5 is >= 2',
      );
    });

    it('should not fetch condition deps when no conditions present', async () => {
      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [{type: PromptItemType.TEXT, text: 'No conditions'}],
      };

      await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      // Should not fetch stage config or answers for conditions
      expect(firestoreUtils.getFirestoreStage).not.toHaveBeenCalled();
      expect(firestoreUtils.getFirestoreAnswersForStage).not.toHaveBeenCalled();
    });

    it('should fetch condition deps only for stages referenced in conditions', async () => {
      const anotherSurveyStageId = 'another-survey-stage';

      const promptConfig: BasePromptConfig = {
        type: StageKind.PRIVATE_CHAT,
        prompt: [
          {
            type: PromptItemType.TEXT,
            text: 'Conditional',
            condition: createComparisonCondition(
              {stageId: mockSurveyStageId, questionId: 'q1'},
              ComparisonOperator.GREATER_THAN,
              5,
            ),
          },
        ],
      };

      await getFirestoreDataForStructuredPrompt(
        mockExperimentId,
        mockCohortId,
        mockStageId,
        mockParticipant,
        promptConfig,
      );

      // Should only fetch the survey stage referenced in conditions
      expect(firestoreUtils.getFirestoreStage).toHaveBeenCalledTimes(1);
      expect(firestoreUtils.getFirestoreStage).toHaveBeenCalledWith(
        mockExperimentId,
        mockSurveyStageId,
      );
      // Should not fetch another-survey-stage
      expect(firestoreUtils.getFirestoreStage).not.toHaveBeenCalledWith(
        mockExperimentId,
        anotherSurveyStageId,
      );
    });
  });
});
