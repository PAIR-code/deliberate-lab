import {validateSurveyQuestions} from './survey_stage.validation';
import {
  SurveyQuestionKind,
  MultipleChoiceDisplayType,
  SurveyQuestion,
} from './survey_stage';

describe('validateSurveyQuestions', () => {
  it('should fail when questions array is empty', () => {
    const res = validateSurveyQuestions([]);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain(
        'Survey stage must contain at least one question',
      );
    }
  });

  it('should pass on a valid scale question', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        kind: SurveyQuestionKind.SCALE,
        questionTitle: 'Rating',
        lowerValue: 1,
        lowerText: 'Poor',
        upperValue: 5,
        upperText: 'Excellent',
        middleText: 'Average',
        useSlider: false,
        stepSize: 1,
      },
    ];
    expect(validateSurveyQuestions(questions)).toEqual({valid: true});
  });

  it('should fail on a scale question with lowerValue >= upperValue', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        kind: SurveyQuestionKind.SCALE,
        questionTitle: 'Rating',
        lowerValue: 5,
        lowerText: 'Poor',
        upperValue: 1,
        upperText: 'Excellent',
        middleText: 'Average',
        useSlider: false,
        stepSize: 1,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain(
        'has lower value (5) greater than or equal to upper value (1)',
      );
    }
  });

  it('should fail when scale question values are not integers', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        kind: SurveyQuestionKind.SCALE,
        questionTitle: 'Rating',
        lowerValue: 1.5,
        lowerText: '',
        upperValue: 5.5,
        upperText: '',
        middleText: '',
        useSlider: false,
        stepSize: 1,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('must be integers');
    }
  });

  it('should fail when step size is 0', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        kind: SurveyQuestionKind.SCALE,
        questionTitle: 'Rating',
        lowerValue: 1,
        lowerText: '',
        upperValue: 5,
        upperText: '',
        middleText: '',
        useSlider: false,
        stepSize: 0,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('must be greater than 0');
    }
  });

  it('should fail when step size exceeds max-min', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        kind: SurveyQuestionKind.SCALE,
        questionTitle: 'Rating',
        lowerValue: 1,
        lowerText: '',
        upperValue: 5,
        upperText: '',
        middleText: '',
        useSlider: false,
        stepSize: 6,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('must divide max-min');
    }
  });

  it('should fail when step size does not divide max-min exactly', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q1',
        kind: SurveyQuestionKind.SCALE,
        questionTitle: 'Rating',
        lowerValue: 1,
        lowerText: '',
        upperValue: 5,
        upperText: '',
        middleText: '',
        useSlider: false,
        stepSize: 3,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('must divide max-min');
    }
  });

  it('should pass on a valid multiple choice question', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q2',
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        questionTitle: 'Pick one',
        options: [
          {id: 'opt1', text: 'Option 1', imageId: ''},
          {id: 'opt2', text: 'Option 2', imageId: ''},
        ],
        correctAnswerId: 'opt1',
        displayType: MultipleChoiceDisplayType.RADIO,
      },
    ];
    expect(validateSurveyQuestions(questions)).toEqual({valid: true});
  });

  it('should pass on a valid multiple choice question with null correctAnswerId', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q2',
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        questionTitle: 'Pick one',
        options: [
          {id: 'opt1', text: 'Option 1', imageId: ''},
          {id: 'opt2', text: 'Option 2', imageId: ''},
        ],
        correctAnswerId: null,
        displayType: MultipleChoiceDisplayType.RADIO,
      },
    ];
    expect(validateSurveyQuestions(questions)).toEqual({valid: true});
  });

  it('should fail on multiple choice question with no options', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q2',
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        questionTitle: 'Pick one',
        options: [],
        correctAnswerId: null,
        displayType: MultipleChoiceDisplayType.RADIO,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain('must have at least one option');
    }
  });

  it('should fail on multiple choice question with non-matching correctAnswerId', () => {
    const questions: SurveyQuestion[] = [
      {
        id: 'q2',
        kind: SurveyQuestionKind.MULTIPLE_CHOICE,
        questionTitle: 'Pick one',
        options: [
          {id: 'opt1', text: 'Option 1', imageId: ''},
          {id: 'opt2', text: 'Option 2', imageId: ''},
        ],
        correctAnswerId: 'opt3',
        displayType: MultipleChoiceDisplayType.RADIO,
      },
    ];
    const res = validateSurveyQuestions(questions);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toContain(
        'has a correct answer ID "opt3" that doesn\'t match any option ID',
      );
    }
  });
});
