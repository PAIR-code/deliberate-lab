import {StageKind} from './stage';
import {
  getSurveyPerParticipantStageDisplayPromptString,
  getSurveyStageDisplayPromptString,
} from './survey_stage.prompts';
import {
  SurveyQuestion,
  SurveyQuestionKind,
  SurveyStageParticipantAnswer,
  TextSurveyQuestion,
  CheckSurveyQuestion,
  MultipleChoiceSurveyQuestion,
  ScaleSurveyQuestion,
  SurveyPerParticipantStageParticipantAnswer,
} from './survey_stage';

// Mocks
const mockTextQuestion: TextSurveyQuestion = {
  id: 'text-q',
  kind: SurveyQuestionKind.TEXT,
  questionTitle: 'What is your favorite color?',
};

const mockCheckQuestion: CheckSurveyQuestion = {
  id: 'check-q',
  kind: SurveyQuestionKind.CHECK,
  questionTitle: 'Do you agree?',
  isRequired: true,
};

const mockMcQuestion: MultipleChoiceSurveyQuestion = {
  id: 'mc-q',
  kind: SurveyQuestionKind.MULTIPLE_CHOICE,
  questionTitle: 'Choose one:',
  options: [
    {id: 'opt1', text: 'Option 1', imageId: ''},
    {id: 'opt2', text: 'Option 2', imageId: ''},
  ],
  correctAnswerId: null,
};

const mockScaleQuestion: ScaleSurveyQuestion = {
  id: 'scale-q',
  kind: SurveyQuestionKind.SCALE,
  questionTitle: 'Rate on a scale of 1 to 5.',
  lowerValue: 1,
  lowerText: 'Bad',
  upperValue: 5,
  upperText: 'Good',
  middleText: 'Okay',
  useSlider: false,
  stepSize: 1,
};

const mockQuestions: SurveyQuestion[] = [
  mockTextQuestion,
  mockCheckQuestion,
  mockMcQuestion,
  mockScaleQuestion,
];

const mockParticipant1 = {
  participantPublicId: 'p1',
  participantDisplayName: 'Participant 1',
};

const mockParticipant2 = {
  participantPublicId: 'p2',
  participantDisplayName: 'Participant 2',
};

const mockAnswerP1: SurveyStageParticipantAnswer = {
  id: 'stage1',
  kind: StageKind.SURVEY,
  answerMap: {
    'text-q': {
      id: 'text-q',
      kind: SurveyQuestionKind.TEXT,
      answer: 'Blue',
    },
    'check-q': {
      id: 'check-q',
      kind: SurveyQuestionKind.CHECK,
      isChecked: true,
    },
    'mc-q': {
      id: 'mc-q',
      kind: SurveyQuestionKind.MULTIPLE_CHOICE,
      choiceId: 'opt1',
    },
    'scale-q': {
      id: 'scale-q',
      kind: SurveyQuestionKind.SCALE,
      value: 4,
    },
  },
};

const mockAnswerP2: SurveyStageParticipantAnswer = {
  id: 'stage1',
  kind: StageKind.SURVEY,
  answerMap: {
    'text-q': {
      id: 'text-q',
      kind: SurveyQuestionKind.TEXT,
      answer: 'Red',
    },
    // P2 did not answer the check question
    'mc-q': {
      id: 'mc-q',
      kind: SurveyQuestionKind.MULTIPLE_CHOICE,
      choiceId: 'opt2',
    },
    'scale-q': {
      id: 'scale-q',
      kind: SurveyQuestionKind.SCALE,
      value: 2,
    },
  },
};

const mockPerParticipantAnswerP1: SurveyPerParticipantStageParticipantAnswer = {
  id: 'stage2',
  kind: StageKind.SURVEY_PER_PARTICIPANT,
  answerMap: {
    p2: {
      'text-q': {
        id: 'text-q',
        kind: SurveyQuestionKind.TEXT,
        answer: 'P1 thinks P2 likes blue',
      },
      'scale-q': {
        id: 'scale-q',
        kind: SurveyQuestionKind.SCALE,
        value: 5,
      },
    },
  },
};

const mockPerParticipantAnswerP2: SurveyPerParticipantStageParticipantAnswer = {
  id: 'stage2',
  kind: StageKind.SURVEY_PER_PARTICIPANT,
  answerMap: {
    p1: {
      'text-q': {
        id: 'text-q',
        kind: SurveyQuestionKind.TEXT,
        answer: 'P2 thinks P1 likes red',
      },
      'scale-q': {
        id: 'scale-q',
        kind: SurveyQuestionKind.SCALE,
        value: 3,
      },
    },
    p3: {
      'text-q': {
        id: 'text-q',
        kind: SurveyQuestionKind.TEXT,
        answer: 'P2 thinks P3 likes green',
      },
      'scale-q': {
        id: 'scale-q',
        kind: SurveyQuestionKind.SCALE,
        value: 6,
      },
    },
  },
};

// TODO: Test that all required survey answers are completed
// (and in implementation, consider retrying for skipped answers)
describe('Display strings for survey/survey-per-participant stages', () => {
  describe('getSurveyStageDisplayPromptString', () => {
    it('should return only the questions when there are no answers', () => {
      const result = getSurveyStageDisplayPromptString([], mockQuestions);
      expect(result).toContain(
        '* What is your favorite color? (Text response)',
      );
      expect(result).toContain('* Do you agree? (Checkbox, required)');
      expect(result).toContain(
        '* Choose one: (Multiple choice: Option 1 (opt1), Option 2 (opt2))',
      );
      expect(result).toContain(
        '* Rate on a scale of 1 to 5. (Scale: 1 = Bad, 3 = Okay, 5 = Good)',
      );
    });

    it('should format a single participant answer correctly', () => {
      const participantAnswers = [{...mockParticipant1, answer: mockAnswerP1}];
      const result = getSurveyStageDisplayPromptString(
        participantAnswers,
        mockQuestions,
      );
      const expected = `* Participant Participant 1's answers:
  * What is your favorite color?: Blue
  * Do you agree?: Checked
  * Choose one:: Option 1
  * Rate on a scale of 1 to 5.: 4 (Scale: 1 = Bad, 3 = Okay, 5 = Good)`;
      expect(result).toBe(expected);
    });

    it('should handle multiple participant answers', () => {
      const participantAnswers = [
        {...mockParticipant1, answer: mockAnswerP1},
        {...mockParticipant2, answer: mockAnswerP2},
      ];
      const result = getSurveyStageDisplayPromptString(
        participantAnswers,
        mockQuestions,
      );
      const expectedP1 = `* Participant Participant 1's answers:
  * What is your favorite color?: Blue
  * Do you agree?: Checked
  * Choose one:: Option 1
  * Rate on a scale of 1 to 5.: 4 (Scale: 1 = Bad, 3 = Okay, 5 = Good)`;
      const expectedP2 = `* Participant Participant 2's answers:
  * What is your favorite color?: Red
  * Do you agree?: (not answered yet)
  * Choose one:: Option 2
  * Rate on a scale of 1 to 5.: 2 (Scale: 1 = Bad, 3 = Okay, 5 = Good)`;
      expect(result).toBe(`${expectedP1}\n${expectedP2}`);
    });

    it('should correctly indicate when a question is not answered', () => {
      const participantAnswers = [{...mockParticipant2, answer: mockAnswerP2}];
      const result = getSurveyStageDisplayPromptString(
        participantAnswers,
        mockQuestions,
      );
      expect(result).toContain('* Do you agree?: (not answered yet)');
    });
  });

  describe('getSurveyPerParticipantStageDisplayPromptString', () => {
    const perParticipantQuestions = [mockTextQuestion, mockScaleQuestion];

    it('should return only the questions when there are no answers', () => {
      const result = getSurveyPerParticipantStageDisplayPromptString(
        [],
        perParticipantQuestions,
      );
      expect(result).toContain(
        '* What is your favorite color? (Text response)',
      );
      expect(result).toContain(
        '* Rate on a scale of 1 to 5. (Scale: 1 = Bad, 3 = Okay, 5 = Good)',
      );
    });

    it('should format a single per-participant answer correctly', () => {
      const participantAnswers = [
        {...mockParticipant1, answer: mockPerParticipantAnswerP1},
      ];
      const result = getSurveyPerParticipantStageDisplayPromptString(
        participantAnswers,
        perParticipantQuestions,
      );
      const expected = `* Participant Participant 1's answers:
  * What is your favorite color?:
    * About p2: P1 thinks P2 likes blue
  * Rate on a scale of 1 to 5.:
    * About p2: 5 (Scale: 1 = Bad, 3 = Okay, 5 = Good)`;
      expect(result).toBe(expected);
    });

    it('should handle multiple per-participant answers', () => {
      const participantAnswers = [
        {...mockParticipant1, answer: mockPerParticipantAnswerP1},
        {...mockParticipant2, answer: mockPerParticipantAnswerP2},
      ];
      const result = getSurveyPerParticipantStageDisplayPromptString(
        participantAnswers,
        perParticipantQuestions,
      );
      const expectedP1 = `* Participant Participant 1's answers:
  * What is your favorite color?:
    * About p2: P1 thinks P2 likes blue
  * Rate on a scale of 1 to 5.:
    * About p2: 5 (Scale: 1 = Bad, 3 = Okay, 5 = Good)`;
      const expectedP2 = `* Participant Participant 2's answers:
  * What is your favorite color?:
    * About p1: P2 thinks P1 likes red
    * About p3: P2 thinks P3 likes green
  * Rate on a scale of 1 to 5.:
    * About p1: 3 (Scale: 1 = Bad, 3 = Okay, 5 = Good)
    * About p3: 6 (Scale: 1 = Bad, 3 = Okay, 5 = Good)`;
      expect(result).toBe(`${expectedP1}\n${expectedP2}`);
    });
  });
});
