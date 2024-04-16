/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { HttpClient } from '@angular/common/http';
import {
  Component,
  Inject,
  OnDestroy,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Unsubscribe } from 'firebase/firestore';
import { userMessageMutation } from 'src/lib/api/mutations';
import { Participant } from 'src/lib/participant';
import {
  EXPERIMENT_PROVIDER_TOKEN,
  ExperimentProvider,
  PARTICIPANT_PROVIDER_TOKEN,
  ParticipantProvider,
} from 'src/lib/provider-tokens';
import { MutationType } from 'src/lib/types/api.types';
import { ItemPair } from 'src/lib/types/items.types';
import { Message, UserMessageMutationData } from 'src/lib/types/messages.types';
import { ParticipantExtended } from 'src/lib/types/participants.types';
import { ExpStageChatAboutItems, StageKind } from 'src/lib/types/stages.types';
import { chatMessagesSubscription } from 'src/lib/utils/firestore.utils';
import { extendUntilMatch } from 'src/lib/utils/object.utils';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatUserProfileComponent } from './chat-user-profile/chat-user-profile.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';
@Component({
  selector: 'app-exp-chat',
  standalone: true,
  imports: [
    ChatUserMessageComponent,
    ChatDiscussItemsMessageComponent,
    ChatMediatorMessageComponent,
    ChatUserProfileComponent,
    MediatorFeedbackComponent,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './exp-chat.component.html',
  styleUrl: './exp-chat.component.scss',
})
export class ExpChatComponent implements OnDestroy {
  public message: string = '';

  public participant: Participant;
  public otherParticipants: Signal<ParticipantExtended[]>;
  public everyoneReachedTheChat: Signal<boolean>;
  public everyoneFinishedTheChat: Signal<boolean>;

  // Extracted stage data
  public stage: ExpStageChatAboutItems;
  public ratingsToDiscuss: Signal<ItemPair[]>;
  public currentRatingsToDiscuss: Signal<ItemPair>;

  // Queries
  private http = inject(HttpClient);

  // TODO: another subscription
  public readyToEndChat: boolean = false;

  // Message subscription
  public messages: WritableSignal<Message[]>;
  private unsubscribe: Unsubscribe | undefined;

  // Message mutation
  public messageMutation: MutationType<UserMessageMutationData, object>;

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ParticipantProvider,
    @Inject(EXPERIMENT_PROVIDER_TOKEN) experimentProvider: ExperimentProvider,
  ) {
    this.participant = participantProvider.get(); // Get the participant instance
    this.everyoneReachedTheChat = this.participant.everyoneReachedCurrentStage;

    // Extract stage data
    this.stage = this.participant.assertViewingStageCast(StageKind.GroupChat)!;
    this.ratingsToDiscuss = signal(this.stage.config.ratingsToDiscuss); // TODO: the experimenter may send an update about the ratings to discuss. Firestore subscription
    this.currentRatingsToDiscuss = computed(() => {
      // Last item in the array
      return this.ratingsToDiscuss()[this.ratingsToDiscuss().length - 1];
    });

    this.otherParticipants = computed(
      () =>
        experimentProvider
          .get()()
          ?.participants.filter(({ uid }) => uid !== this.participant.userData()?.uid) ?? [],
    );

    // Firestore subscription for messages
    this.messages = signal([]);
    this.unsubscribe = chatMessagesSubscription(this.stage.config.chatId, (m) => {
      this.messages.set(extendUntilMatch(this.messages(), m.reverse(), 'uid'));
    });

    // Message mutation creation
    this.messageMutation = userMessageMutation(this.http);

    // TODO: use another subscription to firestore for per-chat synchronization (as for the experiments)
    // => this means that the flip button will send a request every time it is flipped in order to update this user's state of readyness for the chat
    // NOTE: we also must update the stage data for the user. Use a pinpointed updateDoc() call to exactly do this.
    this.everyoneFinishedTheChat = computed(() => {
      // const users = Object.values(this.participant.experiment().participants);
      // return users.every((userData) => {
      //   const otherUserChatStage = userData.stageMap[this.stageData.name] as ExpStageChatAboutItems;
      //   return otherUserChatStage.config.readyToEndChat;
      // });
      const participantsReady: ParticipantExtended[] = [];
      // if (this.stageData().readyToEndChat) {
      //   participantsReady.push(this.participant.userData());
      // }
      // this.otherParticipants().forEach((p) => {
      //   const stage = p.stageMap[this.participant.userData().workingOnStageName]
      //     .config as ChatAboutItems;
      //   if (stage.readyToEndChat) {
      //     participantsReady.push(p);
      //   }
      // });
      const isReady = participantsReady.length === this.otherParticipants().length + 1;

      // Allow "Next" to be pushed.
      // if (isReady) {
      //   const allUsers = Object.values(this.participant.experiment().participants);
      //   for (const user of allUsers) {
      //     user.allowedStageProgressionMap[user.workingOnStageName] = true;
      //   }
      // }
      return isReady;
    });

    // TODO: when everyone finished the chat, automatically go to next.
    // NOTE: only do this if we are currently working on the chat
    effect(
      () => {
        if (this.everyoneFinishedTheChat()) {
          this.participant.nextStep(); // TODO: && viewingstage ) workingonstage
        }
      },
      { allowSignalWrites: true },
    );
  }

  isSilent() {
    return false;
    // return this.stageData().isSilent !== false;
  }

  sendMessage() {
    if (this.message === '') return;

    this.messageMutation.mutate({
      chatId: this.stage.config.chatId,
      text: this.message,
      fromUserId: this.participant.userData()!.uid,
    });
    this.message = '';
  }

  updateToogleValue(_updatedValue: MatSlideToggleChange) {
    // TODO: simple query as well
    // this.participant.editStageData<ChatAboutItems>((d) => {
    //   d.readyToEndChat = updatedValue.checked;
    // });
    // console.log('this.everyoneFinishedTheChat()', this.everyoneFinishedTheChat());
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }
}
