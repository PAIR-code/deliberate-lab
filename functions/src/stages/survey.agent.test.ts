const mockDocGet = jest.fn();
jest.mock('../app', () => ({
  app: {
    firestore: () => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: mockDocGet,
    }),
  },
}));

import * as agentUtils from '../agent.utils';
import * as firestoreUtils from '../utils/firestore';
import {
  APIKeyConfig,
  BasePromptConfig,
  ParticipantProfileExtended,
  SurveyStageConfig,
  SurveyQuestionKind,
  createTextSurveyQuestion,
  createCheckSurveyQuestion,
  createMultipleChoiceSurveyQuestion,
  createScaleSurveyQuestion,
  createMultipleChoiceItem,
  ModelResponseStatus,
  StageKind,
  createBasePromptConfig,
} from '@deliberation-lab/utils';
import {getAgentParticipantSurveyStageResponse} from './survey.agent';

describe('survey.agent', () => {
  let processModelResponseSpy: jest.SpyInstance;
  let getFirestoreStageSpy: jest.spyInstance;

  const mockApiKeyConfig: APIKeyConfig = {
    geminiApiKey: 'test-api-key',
  };
  const mockExperimentId = 'test-experiment';
  const mockParticipant = {
    privateId: 'participant1',
    publicId: 'participant1',
    currentCohortId: 'cohort1',
    agentConfig: {
      agentId: 'agent1',
      promptContext: '',
      modelSettings: {apiType: 'GEMINI', modelName: 'gemini-pro'},
    },
  } as ParticipantProfileExtended;

  beforeEach(() => {
    jest.clearAllMocks();
    processModelResponseSpy = jest.spyOn(agentUtils, 'processModelResponse');
    getFirestoreStageSpy = jest.spyOn(firestoreUtils, 'getFirestoreStage');
  });

  it('should return undefined if participant is not an agent', async () => {
    const participant = {...mockParticipant, agentConfig: undefined};
    const stage = {questions: []} as SurveyStageConfig;

    const response = await getAgentParticipantSurveyStageResponse(
      mockExperimentId,
      mockApiKeyConfig,
      participant,
      stage,
    );

    expect(response).toBeUndefined();
  });

  it('should return undefined if no prompt config is found', async () => {
    const stage = {questions: []} as SurveyStageConfig;
    mockDocGet.mockResolvedValue({exists: false, data: () => undefined});

    const response = await getAgentParticipantSurveyStageResponse(
      mockExperimentId,
      mockApiKeyConfig,
      mockParticipant,
      stage,
    );

    expect(response).toBeUndefined();
  });

  describe('question responses', () => {
    let basePromptConfig: BasePromptConfig;

    beforeEach(() => {
      basePromptConfig = createBasePromptConfig('stage1', StageKind.SURVEY);
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => basePromptConfig,
      });
    });

    it('should generate a response for a TEXT question', async () => {
      const question = createTextSurveyQuestion({
        id: 'q1',
        questionTitle: 'Your name?',
      });
      const stage = {
        id: 'stage1',
        questions: [question],
        descriptions: {
          primaryText: 'Survey',
          infoText: '',
          helpText: '',
        },
      } as SurveyStageConfig;
      getFirestoreStageSpy.mockResolvedValue(stage);
      processModelResponseSpy.mockResolvedValue({
        status: ModelResponseStatus.OK,
        parsedResponse: {response: 'My name is Agent'},
      });

      const response = await getAgentParticipantSurveyStageResponse(
        mockExperimentId,
        mockApiKeyConfig,
        mockParticipant,
        stage,
      );

      expect(response?.answerMap['q1']).toEqual({
        id: 'q1',
        kind: SurveyQuestionKind.TEXT,
        answer: 'My name is Agent',
      });
    });

    it('should generate a response for a CHECK question', async () => {
      const question = createCheckSurveyQuestion({
        id: 'q2',
        questionTitle: 'Agree?',
      });
      const stage = {
        id: 'stage1',
        questions: [question],
        descriptions: {
          primaryText: 'Survey',
          infoText: '',
          helpText: '',
        },
      } as SurveyStageConfig;
      getFirestoreStageSpy.mockResolvedValue(stage);
      processModelResponseSpy.mockResolvedValue({
        status: ModelResponseStatus.OK,
        parsedResponse: {response: true},
      });

      const response = await getAgentParticipantSurveyStageResponse(
        mockExperimentId,
        mockApiKeyConfig,
        mockParticipant,
        stage,
      );

      expect(response?.answerMap['q2']).toEqual({
        id: 'q2',
        kind: SurveyQuestionKind.CHECK,
        isChecked: true,
      });
    });

    it('should generate a response for a MULTIPLE_CHOICE question', async () => {
      const question = createMultipleChoiceSurveyQuestion({
        id: 'q3',
        questionTitle: 'Favorite color?',
        options: [createMultipleChoiceItem({id: 'red', text: 'Red'})],
      });
      const stage = {
        id: 'stage1',
        questions: [question],
        descriptions: {
          primaryText: 'Survey',
          infoText: '',
          helpText: '',
        },
      } as SurveyStageConfig;
      getFirestoreStageSpy.mockResolvedValue(stage);
      processModelResponseSpy.mockResolvedValue({
        status: ModelResponseStatus.OK,
        parsedResponse: {response: 'red'},
      });

      const response = await getAgentParticipantSurveyStageResponse(
        mockExperimentId,
        mockApiKeyConfig,
        mockParticipant,
        stage,
      );

      expect(response?.answerMap['q3']).toEqual({
        id: 'q3',
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        choiceId: 'red',
      });
    });

    it('should generate a response for a SCALE question (INTEGER)', async () => {
      const question = createScaleSurveyQuestion({
        id: 'q4',
        questionTitle: 'Rate 1-5',
        lowerValue: 1,
        upperValue: 5,
        stepSize: 1,
      });
      const stage = {
        id: 'stage1',
        questions: [question],
        descriptions: {
          primaryText: 'Survey',
          infoText: '',
          helpText: '',
        },
      } as SurveyStageConfig;
      getFirestoreStageSpy.mockResolvedValue(stage);
      processModelResponseSpy.mockResolvedValue({
        status: ModelResponseStatus.OK,
        parsedResponse: {response: 4},
      });

      const response = await getAgentParticipantSurveyStageResponse(
        mockExperimentId,
        mockApiKeyConfig,
        mockParticipant,
        stage,
      );

      expect(response?.answerMap['q4']).toEqual({
        id: 'q4',
        kind: SurveyQuestionKind.SCALE,
        value: 4,
      });
    });

    it('should generate a response for a SCALE question (NUMBER)', async () => {
      const question = createScaleSurveyQuestion({
        id: 'q5',
        questionTitle: 'Rate 0-1',
        lowerValue: 0,
        upperValue: 1,
        stepSize: 0.1,
      });
      const stage = {
        id: 'stage1',
        questions: [question],
        descriptions: {
          primaryText: 'Survey',
          infoText: '',
          helpText: '',
        },
      } as SurveyStageConfig;
      getFirestoreStageSpy.mockResolvedValue(stage);
      processModelResponseSpy.mockResolvedValue({
        status: ModelResponseStatus.OK,
        parsedResponse: {response: 0.7},
      });

      const response = await getAgentParticipantSurveyStageResponse(
        mockExperimentId,
        mockApiKeyConfig,
        mockParticipant,
        stage,
      );

      expect(response?.answerMap['q5']).toEqual({
        id: 'q5',
        kind: SurveyQuestionKind.SCALE,
        value: 0.7,
      });
    });
  });
});
