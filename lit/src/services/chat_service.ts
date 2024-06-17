import { observable, makeObservable, computed } from "mobx";
import { Service } from "./service";
import { ExperimentService } from "./experiment_service";
import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";

import { collectSnapshotWithId } from "../shared/utils";
import { Unsubscribe, collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { ChatAnswer, Message, MessageKind, StageKind, } from "@llm-mediation-experiments/utils";
import { createMessageCallable } from "../shared/callables";

interface ServiceProvider {
  firebaseService: FirebaseService;
  experimentService: ExperimentService;
  routerService: RouterService;
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

  updateForCurrentRoute(chatId: string) {
    const eid = this.sp.routerService.activeRoute.params["experiment"];
    const pid = this.sp.routerService.activeRoute.params["participant"];

    if (eid !== this.experimentId || pid !== this.participantId
      || chatId !== this.chatId) {
      this.setChat(eid, pid, chatId);
    }
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

  getCurrentRatingIndex() {
    const stageData = this.sp.experimentService.getPublicStageData(
      this.chat?.stageName!
    );
    if (!stageData || stageData.kind !== StageKind.GroupChat) {
      return -1;
    }

    return stageData.chatData.currentRatingIndex;
  }


    // ******************************************************************************************* //
  //                                          MUTATIONS                                          //
  // ****************************************************************************************** //

  /** Mark this participant as ready to end the chat, or ready to discuss about the next pair of items.
   * @rights Participant
   */
  async markReadyToEndChat(readyToEndChat: boolean, numDiscussions = 1) {
    // TODO: Clean up temporary fix
    // The backend functions don't currently update readyToEndChat to false
    // after advancing to the next ranking discussion.
    // To temporarily fix this, manually reset everyone's readyToEndChat
    // if this is the last participant ending the current discussion.

    const { ready, notReady } =
      this.sp.experimentService.getParticipantsReadyToEndChat(this.chat?.stageName!);

    const reset = notReady.length === 1 && this.getCurrentRatingIndex() < numDiscussions - 1;

    // Actual logic to mark readyToEndChat
    updateDoc(
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

    // Temporary fix to reset readyToEndChat (see above)
    if (reset) {
      for (const participant of this.sp.experimentService.participants) {
        updateDoc(
          doc(
            this.sp.firebaseService.firestore,
            'experiments',
            this.experimentId!,
            'participants',
            participant.privateId,
            'chats',
            this.chatId!,
          ),
          {
            readyToEndChat: false
          }
        );
      }
    }
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
