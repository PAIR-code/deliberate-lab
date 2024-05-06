import { Signal, WritableSignal, signal } from '@angular/core';
import { ChatAnswer, Message } from '@llm-mediation-experiments/utils';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { collectSnapshotWithId } from '../utils/firestore.utils';
import { BaseRepository } from './base.repository';

export class ChatRepository extends BaseRepository {
  // Internal writable signals
  private _chat: WritableSignal<ChatAnswer | undefined> = signal(undefined);
  private _messages: WritableSignal<Message[]> = signal([]);

  // Expose the signals as read-only
  public get chat(): Signal<ChatAnswer | undefined> {
    return this._chat;
  }

  public get messages(): Signal<Message[]> {
    return this._messages;
  }

  /** Each chat is replicated for each participant.
   * @param experimentId Experiment unique identifier (firestore document id)
   * @param participantId Participant unique identifier (firestore document id)
   * @param chatId Chat unique identifier (firestore document id)
   */
  constructor(
    public readonly experimentId: string,
    public readonly participantId: string,
    public readonly chatId: string,
  ) {
    super();

    // Subscribe to the participant chat config
    this.unsubscribe.push(
      onSnapshot(
        doc(firestore, 'experiments', experimentId, 'participants', participantId, 'chats', chatId),
        (doc) => {
          this._chat.set(doc.data() as ChatAnswer);
        },
      ),
    );

    // Subscribe to the chat messages
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            firestore,
            'experiments',
            experimentId,
            'participants',
            participantId,
            'chats',
            chatId,
            'messages',
          ),
          orderBy('timestamp', 'desc'),
        ),
        (snapshot) => {
          // Note that Firestore will send incremental updates. The full list of messages can be reconstructed easily from the snapshot.
          this._messages.set(collectSnapshotWithId<Message>(snapshot, 'uid'));
        },
      ),
    );
  }
}
