import {
  ChatMessage,
  UserType,
  createChatMessage,
  PRIVATE_CHAT_TIMESTAMP_EXPLANATION,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {convertChatToMessages, MessageRole} from './message_converter.utils';
import {stripTimestampPrefix} from './chat.agent';

describe('message_converter.utils & timestamp handling', () => {
  const timestamp = Timestamp.fromDate(new Date('2026-08-20T14:30:00Z'));
  const testMessages: ChatMessage[] = [
    createChatMessage({
      message: 'Hello mediator',
      type: UserType.PARTICIPANT,
      senderId: 'user1',
      timestamp,
    }),
    createChatMessage({
      message: 'Hello participant',
      type: UserType.MEDIATOR,
      senderId: 'mediator1',
      timestamp,
    }),
    createChatMessage({
      message: 'Time is half over',
      type: UserType.SYSTEM,
      senderId: 'system',
      timestamp,
    }),
  ];

  it('converts messages without timestamps by default', () => {
    const result = convertChatToMessages(testMessages, UserType.MEDIATOR, {
      isPrivateChat: true,
      includeTimestampsPrivateChat: false,
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      role: MessageRole.USER,
      content: 'Hello mediator',
    });
    expect(result[1]).toEqual({
      role: MessageRole.ASSISTANT,
      content: 'Hello participant',
    });
    expect(result[2]).toEqual({
      role: MessageRole.USER,
      content: '[SYSTEM NOTIFICATION]: Time is half over',
    });
  });

  it('converts messages with (HH:MM) timestamps when includeTimestampsPrivateChat is true for Mediator', () => {
    const result = convertChatToMessages(testMessages, UserType.MEDIATOR, {
      isPrivateChat: true,
      includeTimestampsPrivateChat: true,
    });

    expect(result).toHaveLength(3);
    expect(result[0].role).toBe(MessageRole.USER);
    expect(result[0].content).toMatch(/^\(\d{2}:\d{2}\) Hello mediator$/);

    expect(result[1].role).toBe(MessageRole.ASSISTANT);
    expect(result[1].content).toMatch(/^\(\d{2}:\d{2}\) Hello participant$/);

    expect(result[2].role).toBe(MessageRole.USER);
    expect(result[2].content).toMatch(
      /^\(\d{2}:\d{2}\) \[SYSTEM NOTIFICATION\]: Time is half over$/,
    );
  });

  it('converts messages with (HH:MM) timestamps when includeTimestampsPrivateChat is true for Participant', () => {
    const result = convertChatToMessages(testMessages, UserType.PARTICIPANT, {
      isPrivateChat: true,
      includeTimestampsPrivateChat: true,
    });

    expect(result).toHaveLength(3);
    expect(result[0].role).toBe(MessageRole.ASSISTANT);
    expect(result[0].content).toMatch(/^\(\d{2}:\d{2}\) Hello mediator$/);

    expect(result[1].role).toBe(MessageRole.USER);
    expect(result[1].content).toMatch(/^\(\d{2}:\d{2}\) Hello participant$/);

    expect(result[2].role).toBe(MessageRole.USER);
    expect(result[2].content).toMatch(
      /^\(\d{2}:\d{2}\) \[SYSTEM NOTIFICATION\]: Time is half over$/,
    );
  });

  it('strips leading timestamp prefixes from outgoing user-facing message', () => {
    expect(stripTimestampPrefix('(14:32) Hello there!')).toBe('Hello there!');
    expect(stripTimestampPrefix('[14:32] Hello there!')).toBe('Hello there!');
    expect(stripTimestampPrefix('(14:32:15) Hello there!')).toBe(
      'Hello there!',
    );
    expect(stripTimestampPrefix('Hello there!')).toBe('Hello there!');
  });

  it('verifies PRIVATE_CHAT_TIMESTAMP_EXPLANATION exact text', () => {
    expect(PRIVATE_CHAT_TIMESTAMP_EXPLANATION).toBe(
      'Each message is prepended with timestamps, e.g., (09:10), to represent when it was sent. Do NOT include timestamps in your own responses.',
    );
  });
});
