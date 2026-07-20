import {
  ChatMessageReaction,
  MAX_CHAT_QUOTE_LENGTH,
  createChatMessageReply,
  createParticipantChatMessage,
  getChatMessageReactionCount,
  getChatMessageReactors,
  hasChatMessageReaction,
} from './chat_message';

describe('chat message reactions', () => {
  it('defaults to no reactions and no reply', () => {
    const chatMessage = createParticipantChatMessage({message: 'Hello'});

    expect(chatMessage.reactionMap).toEqual({});
    expect(chatMessage.replyTo).toBeNull();
    expect(
      getChatMessageReactionCount(chatMessage, ChatMessageReaction.HEART),
    ).toBe(0);
  });

  it('reads reactors and counts', () => {
    const chatMessage = createParticipantChatMessage({
      message: 'Hello',
      reactionMap: {
        [ChatMessageReaction.HEART]: ['alice', 'bob'],
        [ChatMessageReaction.THUMBS_UP]: ['carol'],
      },
    });

    expect(
      getChatMessageReactors(chatMessage, ChatMessageReaction.HEART),
    ).toEqual(['alice', 'bob']);
    expect(
      getChatMessageReactionCount(chatMessage, ChatMessageReaction.HEART),
    ).toBe(2);
    expect(
      getChatMessageReactionCount(chatMessage, ChatMessageReaction.THUMBS_UP),
    ).toBe(1);
    expect(
      hasChatMessageReaction(chatMessage, ChatMessageReaction.HEART, 'alice'),
    ).toBe(true);
    expect(
      hasChatMessageReaction(chatMessage, ChatMessageReaction.HEART, 'carol'),
    ).toBe(false);
  });

  it('treats a message saved before reactions existed as having none', () => {
    // Messages written before this feature have no reactionMap field at all
    const chatMessage = createParticipantChatMessage({message: 'Hello'});
    delete chatMessage.reactionMap;

    expect(
      getChatMessageReactors(chatMessage, ChatMessageReaction.HEART),
    ).toEqual([]);
    expect(
      getChatMessageReactionCount(chatMessage, ChatMessageReaction.HEART),
    ).toBe(0);
    expect(
      hasChatMessageReaction(chatMessage, ChatMessageReaction.HEART, 'alice'),
    ).toBe(false);
  });
});

describe('chat message replies', () => {
  it('quotes the sender and message being replied to', () => {
    const original = createParticipantChatMessage({
      message: 'The original point',
      senderId: 'alice-public-id',
      profile: {name: 'Alice', avatar: '🦊', pronouns: 'she/her'},
    });

    expect(createChatMessageReply(original)).toEqual({
      id: original.id,
      senderId: 'alice-public-id',
      name: 'Alice',
      message: 'The original point',
    });
  });

  it('truncates a long quote so replies cannot grow without bound', () => {
    const original = createParticipantChatMessage({
      message: 'a'.repeat(MAX_CHAT_QUOTE_LENGTH + 100),
      senderId: 'alice-public-id',
    });

    const reply = createChatMessageReply(original);
    expect(reply.message).toHaveLength(MAX_CHAT_QUOTE_LENGTH + 1); // + ellipsis
    expect(reply.message.endsWith('…')).toBe(true);
  });

  it('does not truncate a quote at the length limit', () => {
    const message = 'a'.repeat(MAX_CHAT_QUOTE_LENGTH);
    const original = createParticipantChatMessage({message});

    expect(createChatMessageReply(original).message).toBe(message);
  });

  it('falls back to the sender ID when the sender has no name', () => {
    const original = createParticipantChatMessage({
      message: 'Anonymous point',
      senderId: 'alice-public-id',
    });

    expect(createChatMessageReply(original).name).toBe('alice-public-id');
  });

  it('carries the quote onto the reply', () => {
    const original = createParticipantChatMessage({
      message: 'The original point',
      senderId: 'alice-public-id',
      profile: {name: 'Alice', avatar: '🦊', pronouns: 'she/her'},
    });

    const reply = createParticipantChatMessage({
      message: 'I disagree',
      senderId: 'bob-public-id',
      replyTo: createChatMessageReply(original),
    });

    expect(reply.replyTo?.id).toBe(original.id);
    expect(reply.replyTo?.name).toBe('Alice');
    expect(reply.replyTo?.message).toBe('The original point');
  });
});
