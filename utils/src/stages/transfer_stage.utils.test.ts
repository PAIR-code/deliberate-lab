import {createCohortParticipantConfig} from '../experiment';
import {createParticipantProfileExtended} from '../participant';
import {StageKind} from './stage';
import {
  SurveyQuestionKind,
  createSurveyStage,
  createSurveyStagePublicData,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceItem,
} from './survey_stage';
import {AutoTransferType} from './transfer_stage';
import {groupParticipantsBySurveyAutoTransferConfig} from './transfer_stage.utils';

describe('SurveyAutoTransfer logic', () => {
  const participants = [
    createParticipantProfileExtended({publicId: 'participant-a'}),
    createParticipantProfileExtended({publicId: 'participant-b'}),
    createParticipantProfileExtended({publicId: 'participant-c'}),
    createParticipantProfileExtended({publicId: 'participant-d'}),
    createParticipantProfileExtended({publicId: 'participant-e'}),
  ];
  const surveyStage = createSurveyStage({
    id: 'survey',
    questions: [
      createMultipleChoiceSurveyQuestion({
        id: 'question',
        questionTitle: 'What is your favorite color?',
        options: [
          createMultipleChoiceItem({id: 'blue'}),
          createMultipleChoiceItem({id: 'green'}),
          createMultipleChoiceItem({id: 'red'}),
          createMultipleChoiceItem({id: 'yellow'}),
        ],
      }),
    ],
  });

  describe('groupParticipantsBySurveyAutoTransferConfig', () => {
    it('puts all participants in one group if possible', () => {
      const surveyPublicData = createSurveyStagePublicData('survey');
      surveyPublicData.participantAnswerMap = {
        'participant-a': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'red',
          },
        },
        'participant-b': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'green',
          },
        },
        'participant-c': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'green',
          },
        },
        'participant-d': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'red',
          },
        },
        'participant-e': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'green',
          },
        },
      };
      const surveyTransferConfig = {
        type: AutoTransferType.SURVEY,
        autoCohortParticipantConfig: createCohortParticipantConfig(),
        surveyStageId: 'survey',
        surveyQuestionId: 'question',
        participantCounts: {green: 3, red: 2},
      };

      const resolution = groupParticipantsBySurveyAutoTransferConfig(
        participants,
        surveyStage,
        surveyPublicData,
        surveyTransferConfig,
      );
      const resolutionWithPublicIds = resolution.map((group) =>
        group.map((participant) => participant.publicId),
      );
      expect(resolutionWithPublicIds).toEqual([
        [
          'participant-a',
          'participant-b',
          'participant-c',
          'participant-d',
          'participant-e',
        ],
      ]);
    });

    it('returns multiple complete groups (and no incomplete groups)', () => {
      const surveyPublicData = createSurveyStagePublicData('survey');
      surveyPublicData.participantAnswerMap = {
        'participant-a': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'yellow',
          },
        },
        'participant-b': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'green',
          },
        },
        'participant-c': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'green',
          },
        },
        'participant-d': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'green',
          },
        },
        'participant-e': {
          question: {
            id: 'question',
            kind: SurveyQuestionKind.MULTIPLE_CHOICE,
            choiceId: 'yellow',
          },
        },
      };
      const surveyTransferConfig = {
        type: AutoTransferType.SURVEY,
        autoCohortParticipantConfig: createCohortParticipantConfig(),
        surveyStageId: 'survey',
        surveyQuestionId: 'question',
        participantCounts: {green: 1, yellow: 1},
      };
      const resolution = groupParticipantsBySurveyAutoTransferConfig(
        participants,
        surveyStage,
        surveyPublicData,
        surveyTransferConfig,
      );
      const resolutionWithPublicIds = resolution.map((group) =>
        group.map((participant) => participant.publicId),
      );
      expect(resolutionWithPublicIds).toEqual([
        ['participant-a', 'participant-b'],
        ['participant-c', 'participant-e'],
      ]);
    });
  });
});
