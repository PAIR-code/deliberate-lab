/**
 * Integration tests for chat message reactions.
 *
 * This test requires a Firestore emulator running. Run via:
 * npm run test:firestore
 */

import {app} from '../app';
import {
  ChatMessage,
  ChatMessageReaction,
  StageKind,
  createParticipantChatMessage,
  generateId,
  getChatMessageReactionCount,
  getChatMessageReactors,
  hasChatMessageReaction,
} from '@deliberation-lab/utils';
import {
  ChatMessageNotFoundError,
  getChatMessageRef,
  updateChatMessageReaction,
} from './chat.utils';

const firestore = app.firestore();

const EXPERIMENT_ID = 'reaction-test-experiment';
const COHORT_ID = 'reaction-test-cohort';
const STAGE_ID = 'reaction-test-stage';
const PARTICIPANT_PRIVATE_ID = 'reaction-test-participant';

/** Write a group chat message and return it. */
async function seedGroupChatMessage(): Promise<ChatMessage> {
  const chatMessage = createParticipantChatMessage({
    id: generateId(),
    message: 'A message worth reacting to',
    senderId: 'author-public-id',
  });

  await getChatMessageRef(
    StageKind.CHAT,
    EXPERIMENT_ID,
    COHORT_ID,
    PARTICIPANT_PRIVATE_ID,
    STAGE_ID,
    chatMessage.id,
  ).set(JSON.parse(JSON.stringify(chatMessage)));

  return chatMessage;
}

/** Read a chat message back out of Firestore. */
async function readGroupChatMessage(
  chatMessageId: string,
): Promise<ChatMessage> {
  const snapshot = await getChatMessageRef(
    StageKind.CHAT,
    EXPERIMENT_ID,
    COHORT_ID,
    PARTICIPANT_PRIVATE_ID,
    STAGE_ID,
    chatMessageId,
  ).get();
  return snapshot.data() as ChatMessage;
}

/** Build the endpoint payload for a reaction. */
function reactionData(
  chatMessageId: string,
  senderId: string,
  reaction: ChatMessageReaction,
  add: boolean,
) {
  return {
    experimentId: EXPERIMENT_ID,
    cohortId: COHORT_ID,
    stageId: STAGE_ID,
    participantId: PARTICIPANT_PRIVATE_ID,
    chatMessageId,
    senderId,
    reaction,
    add,
  };
}

describe('chat message reactions', () => {
  afterAll(async () => {
    await firestore.recursiveDelete(
      firestore.collection('experiments').doc(EXPERIMENT_ID),
    );
  });

  it('records who reacted, and counts them', async () => {
    const chatMessage = await seedGroupChatMessage();

    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'alice', ChatMessageReaction.HEART, true),
    );
    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'bob', ChatMessageReaction.HEART, true),
    );

    const updated = await readGroupChatMessage(chatMessage.id);
    expect(getChatMessageReactors(updated, ChatMessageReaction.HEART)).toEqual([
      'alice',
      'bob',
    ]);
    expect(
      getChatMessageReactionCount(updated, ChatMessageReaction.HEART),
    ).toBe(2);
    expect(
      hasChatMessageReaction(updated, ChatMessageReaction.HEART, 'alice'),
    ).toBe(true);
  });

  it('keeps reactions independent of each other', async () => {
    const chatMessage = await seedGroupChatMessage();

    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'alice', ChatMessageReaction.HEART, true),
    );
    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(
        chatMessage.id,
        'alice',
        ChatMessageReaction.THUMBS_UP,
        true,
      ),
    );
    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'bob', ChatMessageReaction.THUMBS_UP, true),
    );

    const updated = await readGroupChatMessage(chatMessage.id);
    expect(
      getChatMessageReactionCount(updated, ChatMessageReaction.HEART),
    ).toBe(1);
    expect(
      getChatMessageReactors(updated, ChatMessageReaction.THUMBS_UP),
    ).toEqual(['alice', 'bob']);
  });

  it('removes only the reacting participant when un-reacting', async () => {
    const chatMessage = await seedGroupChatMessage();

    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'alice', ChatMessageReaction.HEART, true),
    );
    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'bob', ChatMessageReaction.HEART, true),
    );
    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'alice', ChatMessageReaction.HEART, false),
    );

    const updated = await readGroupChatMessage(chatMessage.id);
    expect(getChatMessageReactors(updated, ChatMessageReaction.HEART)).toEqual([
      'bob',
    ]);
    expect(
      hasChatMessageReaction(updated, ChatMessageReaction.HEART, 'alice'),
    ).toBe(false);
  });

  it('does not double-count a participant who reacts twice', async () => {
    const chatMessage = await seedGroupChatMessage();

    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'alice', ChatMessageReaction.HEART, true),
    );
    await updateChatMessageReaction(
      StageKind.CHAT,
      reactionData(chatMessage.id, 'alice', ChatMessageReaction.HEART, true),
    );

    const updated = await readGroupChatMessage(chatMessage.id);
    expect(
      getChatMessageReactionCount(updated, ChatMessageReaction.HEART),
    ).toBe(1);
  });

  it('does not lose reactions applied at the same time', async () => {
    const chatMessage = await seedGroupChatMessage();
    const senderIds = Array.from({length: 8}, (_, index) => `sender-${index}`);

    // Every participant hearts the message simultaneously. A read-modify-write
    // would drop reactions here; arrayUnion must keep all of them.
    await Promise.all(
      senderIds.map((senderId) =>
        updateChatMessageReaction(
          StageKind.CHAT,
          reactionData(
            chatMessage.id,
            senderId,
            ChatMessageReaction.HEART,
            true,
          ),
        ),
      ),
    );

    const updated = await readGroupChatMessage(chatMessage.id);
    expect(
      getChatMessageReactors(updated, ChatMessageReaction.HEART).sort(),
    ).toEqual(senderIds.sort());
  });

  it('rejects a reaction on a message that does not exist', async () => {
    await expect(
      updateChatMessageReaction(
        StageKind.CHAT,
        reactionData(
          'no-such-message',
          'alice',
          ChatMessageReaction.HEART,
          true,
        ),
      ),
    ).rejects.toThrow(ChatMessageNotFoundError);
  });

  it('routes private chat reactions to the participant subcollection', async () => {
    const chatMessage = createParticipantChatMessage({
      id: generateId(),
      message: 'Private message',
      senderId: 'author-public-id',
    });

    await getChatMessageRef(
      StageKind.PRIVATE_CHAT,
      EXPERIMENT_ID,
      COHORT_ID,
      PARTICIPANT_PRIVATE_ID,
      STAGE_ID,
      chatMessage.id,
    ).set(JSON.parse(JSON.stringify(chatMessage)));

    await updateChatMessageReaction(
      StageKind.PRIVATE_CHAT,
      reactionData(
        chatMessage.id,
        'alice',
        ChatMessageReaction.THUMBS_UP,
        true,
      ),
    );

    const snapshot = await getChatMessageRef(
      StageKind.PRIVATE_CHAT,
      EXPERIMENT_ID,
      COHORT_ID,
      PARTICIPANT_PRIVATE_ID,
      STAGE_ID,
      chatMessage.id,
    ).get();
    expect(
      getChatMessageReactors(
        snapshot.data() as ChatMessage,
        ChatMessageReaction.THUMBS_UP,
      ),
    ).toEqual(['alice']);
  });
});
