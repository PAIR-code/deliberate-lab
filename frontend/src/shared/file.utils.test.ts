import * as file_utils from './file.utils';
import {
  createSurveyStage,
  generateId,
  createTextSurveyQuestion,
  createCheckSurveyQuestion,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceItem,
  createScaleSurveyQuestion,
} from '@deliberation-lab/utils';

describe('File utils', () => {
  it('write survey csv columns', () => {
    const config = createSurveyStage({
      questions: [
        createTextSurveyQuestion({
          questionTitle: 'Describe.',
          minCharCount: 1,
          maxCharCount: 100,
        }),
        createCheckSurveyQuestion({
          questionTitle: 'Yes or no?',
        }),
        createMultipleChoiceSurveyQuestion({
          questionTitle: 'What color?',
          options: [
            createMultipleChoiceItem({text: 'Red'}),
            createMultipleChoiceItem({text: 'Green'}),
            createMultipleChoiceItem({text: 'Blue'}),
          ],
        }),
        createScaleSurveyQuestion({
          questionTitle: 'How much?',
        }),
      ],
    });

    const columns = file_utils.getSurveyStageCSVColumns(config, null);

    const expectedColumns = [
      /"Describe." - Survey [-a-z0-9]+/,
      /"Yes or no\?" - Survey [-a-z0-9]+/,
      /Option 1 \([-a-z0-9]+\) - "What color\?" - Survey [-a-z0-9]+/,
      /Option 2 \([-a-z0-9]+\) - "What color\?" - Survey [-a-z0-9]+/,
      /Option 3 \([-a-z0-9]+\) - "What color\?" - Survey [-a-z0-9]+/,
      /Participant answer \(ID\) - "What color\?" - Survey [-a-z0-9]+/,
      /Participant answer \(text\) - "What color\?" - Survey [-a-z0-9]+/,
      /"How much\?" - Survey [-a-z0-9]+/,
    ].map(expect.stringMatching);

    expect(columns).toEqual(expectedColumns);
  });
});
