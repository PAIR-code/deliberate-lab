import * as file_utils from './file.utils';
import {
  ChatMessageReaction,
  createChatMessageReply,
  createParticipantChatMessage,
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

describe('Chat history CSV', () => {
  it('writes reply and reaction headers', () => {
    expect(file_utils.getChatMessageCSVColumns()).toEqual([
      'Timestamp',
      'Message ID',
      'Discussion ID',
      'Message type',
      'Sender ID',
      'Sender name',
      'Sender avatar',
      'Sender pronouns',
      'Message content',
      'Reply to message ID',
      'Reply to sender ID',
      'Reply to content',
      'Heart count',
      'Heart by',
      'Thumbs up count',
      'Thumbs up by',
    ]);
  });

  it('writes replies and reactions, aligned with the headers', () => {
    const original = createParticipantChatMessage({
      message: 'The original point',
      senderId: 'alice',
      profile: {name: 'Alice', avatar: '🦊', pronouns: 'she/her'},
    });

    const reply = createParticipantChatMessage({
      message: 'I disagree',
      senderId: 'bob',
      profile: {name: 'Bob', avatar: '🐻', pronouns: 'he/him'},
      replyTo: createChatMessageReply(original),
      reactionMap: {
        [ChatMessageReaction.HEART]: ['alice', 'carol'],
        [ChatMessageReaction.THUMBS_UP]: ['alice'],
      },
    });

    const headers = file_utils.getChatMessageCSVColumns();
    const row = file_utils.getChatMessageCSVColumns(reply);
    const cells = Object.fromEntries(
      headers.map((header, index) => [header, row[index]]),
    );

    expect(cells['Message content']).toBe('I disagree');
    expect(cells['Reply to message ID']).toBe(original.id);
    expect(cells['Reply to sender ID']).toBe('alice');
    expect(cells['Reply to content']).toBe('The original point');
    expect(cells['Heart count']).toBe('2');
    expect(cells['Heart by']).toBe('alice; carol');
    expect(cells['Thumbs up count']).toBe('1');
    expect(cells['Thumbs up by']).toBe('alice');
  });

  it('leaves reply and reaction cells empty for a plain message', () => {
    const message = createParticipantChatMessage({
      message: 'Just a message',
      senderId: 'alice',
    });

    const headers = file_utils.getChatMessageCSVColumns();
    const row = file_utils.getChatMessageCSVColumns(message);
    const cells = Object.fromEntries(
      headers.map((header, index) => [header, row[index]]),
    );

    expect(cells['Reply to message ID']).toBe('');
    expect(cells['Reply to content']).toBe('');
    expect(cells['Heart count']).toBe('0');
    expect(cells['Heart by']).toBe('');
  });

  it('does not break CSV cells when a reply quotes a comma', () => {
    const original = createParticipantChatMessage({
      message: 'One, two, three',
      senderId: 'alice',
    });
    const reply = createParticipantChatMessage({
      message: 'Counting, are we?',
      senderId: 'bob',
      replyTo: createChatMessageReply(original),
    });

    const row = file_utils.getChatMessageCSVColumns(reply);
    // Every cell must be comma-free, or the row would shift columns
    row.forEach((cell) => expect(cell).not.toContain(','));
    expect(row).toHaveLength(file_utils.getChatMessageCSVColumns().length);
  });
});
