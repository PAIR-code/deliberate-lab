import { observable, makeObservable, computed } from "mobx";
import { Service } from "./service";
import { AuthService } from "./auth_service";
import { SettingsService } from "./settings_service";

import { collectSnapshotWithId } from "../shared/utils";
import { Unsubscribe, collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { FirebaseService } from "./firebase_service";
import { ChatAnswer, Message, MessageKind } from "@llm-mediation-experiments/utils";
import { createMessageCallable } from "../shared/callables";

interface ServiceProvider {
  authService: AuthService;
  settingsService: SettingsService;
  firebaseService: FirebaseService;
}

export class ChatService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }


  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;
  @observable chatId: string | null = null;

  @observable chat: ChatAnswer | undefined = undefined;
  @observable messages: Message[] = [];

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isConfigLoading = false;
  @observable areMessagesLoading = false;

  @computed get isLoading() {
    return this.isConfigLoading || this.areMessagesLoading;
  }

  set isLoading(value: boolean) {
    this.isConfigLoading = value;
    this.areMessagesLoading = value;
  }

  setChat(experimentId: string | null, participantId: string | null, chatId: string | null) {
    this.experimentId = experimentId;
    this.participantId = participantId;
    this.chatId = chatId;
    this.isLoading = true;
    this.loadChatData();
  }

  loadChatData() {
    this.unsubscribeAll();

    if (this.experimentId === null || this.participantId === null || this.chatId === null) {
      this.isLoading = false;
      return;
    }

    // Subscribe to the participant chat config
    this.unsubscribe.push(
      onSnapshot(
        doc(this.sp.firebaseService.firestore, 'experiments', this.experimentId, 'participants', this.participantId, 'chats', this.chatId),
        (doc) => {
          this.chat = doc.data() as ChatAnswer;
          this.isConfigLoading = false;
        },
      ),
    );

    // Subscribe to the chat messages
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.experimentId,
            'participants',
            this.participantId,
            'chats',
            this.chatId,
            'messages',
          ),
          orderBy('timestamp', 'desc'),
        ),
        (snapshot) => {
          // Note that Firestore will send incremental updates. The full list of messages can be reconstructed easily from the snapshot.
          this.messages = collectSnapshotWithId<Message>(snapshot, 'uid').reverse();
          this.areMessagesLoading = false;
        },
      ),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    this.chat = undefined;
    this.messages = [];
  }


    // ******************************************************************************************* //
  //                                          MUTATIONS                                          //
  // ******************************************************************************************* //

  /** Mark this participant as ready to end the chat, or ready to discuss about the next pair of items.
   * @rights Participant
   */
  async markReadyToEndChat(readyToEndChat: boolean) {
    return updateDoc(
      doc(
        this.sp.firebaseService.firestore,
        'experiments',
        this.experimentId!,
        'participants',
        this.participantId!,
        'chats',
        this.chatId!,
      ),
      {
        readyToEndChat,
      },
    );
  }

  /** Send a message as a participant.
   * @rights Participant
   */
  async sendUserMessage(text: string) {
    return createMessageCallable(
      this.sp.firebaseService.functions,
      {
      chatId: this.chatId!,
      experimentId: this.experimentId!,
      message: {
        kind: MessageKind.UserMessage,
        fromPrivateParticipantId: this.participantId!,
        text,
      },
    });
  }

  /** Send a message as a mediator.
   * @rights Experimenter
   */
  async sendMediatorMessage(text: string) {
    return createMessageCallable(
      this.sp.firebaseService.functions,
      {
      chatId: this.chatId!,
      experimentId: this.experimentId!,
      message: {
        kind: MessageKind.MediatorMessage,
        text,
      },
    });
  }

}
