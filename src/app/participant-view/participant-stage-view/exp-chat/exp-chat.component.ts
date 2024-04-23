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
  untracked,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { Unsubscribe } from 'firebase/firestore';
import {
  toggleChatMutation,
  updateChatStageMutation,
  userMessageMutation,
} from 'src/lib/api/mutations';
import { Participant } from 'src/lib/participant';
import {
  EXPERIMENT_PROVIDER_TOKEN,
  ExperimentProvider,
  PARTICIPANT_PROVIDER_TOKEN,
  ParticipantProvider,
} from 'src/lib/provider-tokens';
import { ReadyToEndChat } from 'src/lib/types/chats.types';
import { ItemPair } from 'src/lib/types/items.types';
import { DiscussItemsMessage, Message, MessageType } from 'src/lib/types/messages.types';
import { ParticipantExtended } from 'src/lib/types/participants.types';
import { ExpStageChatAboutItems, StageKind } from 'src/lib/types/stages.types';
import { localStorageTimer } from 'src/lib/utils/angular.utils';
import { chatMessagesSubscription, firestoreDocSubscription } from 'src/lib/utils/firestore.utils';
import { extendUntilMatch } from 'src/lib/utils/object.utils';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatUserProfileComponent } from './chat-user-profile/chat-user-profile.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';

const TIMER_SECONDS = 60; // 1 minute between item pairs for discussions

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
    ReactiveFormsModule,
  ],
  templateUrl: './exp-chat.component.html',
  styleUrl: './exp-chat.component.scss',
})
export class ExpChatComponent implements OnDestroy {
  public participant: Participant;
  public otherParticipants: Signal<ParticipantExtended[]>;
  public everyoneReachedTheChat: Signal<boolean>;

  // Extracted stage data
  public stage: ExpStageChatAboutItems;
  public currentRatingsToDiscuss: WritableSignal<ItemPair>;

  // Queries
  private http = inject(HttpClient);
  private client = injectQueryClient();

  // Message subscription
  public messages: WritableSignal<Message[]>;
  private unsubscribeMessages: Unsubscribe | undefined;

  // Ready to end chat subscription
  private unsubscribeReadyToEndChat: Unsubscribe | undefined;

  // Message mutation & form
  public messageMutation = userMessageMutation(this.http);
  public message = new FormControl<string>('', Validators.required);

  // Chat completion mutation
  public finishChatMutation = updateChatStageMutation(this.http, this.client, () =>
    this.participant.navigateToNextStage(),
  );

  public discussingPairIndex = signal(0);

  public toggleMutation = toggleChatMutation(this.http);
  public readyToEndChat: WritableSignal<boolean> = signal(false); // Frontend-only, no need to have fine-grained backend sync for this

  public timer = localStorageTimer('chat-timer', TIMER_SECONDS, () => this.toggleEndChat()); // 1 minute timer

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ParticipantProvider,
    @Inject(EXPERIMENT_PROVIDER_TOKEN) experimentProvider: ExperimentProvider,
  ) {
    this.participant = participantProvider.get(); // Get the participant instance

    // Extract stage data
    this.stage = this.participant.assertViewingStageCast(StageKind.GroupChat)!;
    this.everyoneReachedTheChat = this.participant.everyoneReachedCurrentStage(this.stage.name);

    // Initialize the current rating to discuss with the first available pair
    const { id1, id2 } = this.stage.config.ratingsToDiscuss[0];
    this.currentRatingsToDiscuss = signal({
      item1: this.stage.config.items[id1],
      item2: this.stage.config.items[id2],
    });

    this.otherParticipants = computed(
      () =>
        experimentProvider
          .get()()
          ?.participants.filter(({ uid }) => uid !== this.participant.userData()?.uid) ?? [],
    );

    // Firestore subscription for messages
    this.messages = signal([]);
    this.unsubscribeMessages = chatMessagesSubscription(this.stage.config.chatId, (m) => {
      this.messages.set(extendUntilMatch(this.messages(), m.reverse(), 'uid'));

      // Find if new discuss items message have arrived
      const last = m.find((m) => m.messageType === MessageType.DiscussItemsMessage) as
        | DiscussItemsMessage
        | undefined;

      if (last) this.currentRatingsToDiscuss.set(last.itemPair);
    });

    // Firestore subscription for ready to end chat
    this.unsubscribeReadyToEndChat = firestoreDocSubscription<ReadyToEndChat>(
      `participants_ready_to_end_chat/${this.stage.config.chatId}`,
      (d) => {
        if (this.discussingPairIndex() !== d?.currentPair && d)
          this.discussingPairIndex.set(d?.currentPair);
      },
    );

    effect(
      () => {
        if (
          this.participant.workingOnStage()?.name !== this.stage.name ||
          !this.everyoneReachedTheChat()
        )
          return; // Continue only if this stage is active

        const index = this.discussingPairIndex();

        if (index < this.stage.config.ratingsToDiscuss.length) {
          // Update to the next, reset the counter.
          this.timer.reset(TIMER_SECONDS);
          this.readyToEndChat.set(false);
        } else {
          // The chat experiment has ended
          this.finishChatMutation.mutate({
            uid: untracked(this.participant.userData)!.uid,
            name: this.stage.name,
            data: { readyToEndChat: true },
            ...this.participant.getStageProgression(),
          });
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
    if (!this.message.valid) return;

    this.messageMutation.mutate({
      chatId: this.stage.config.chatId,
      text: this.message.value!,
      fromUserId: this.participant.userData()!.uid,
    });
    this.message.setValue('');
  }

  toggleEndChat() {
    if (this.readyToEndChat()) return;

    this.readyToEndChat.set(true);
    this.toggleMutation.mutate({
      chatId: this.stage.config.chatId,
      participantId: this.participant.userData()!.uid,
      readyToEndChat: true,
    });

    this.message.disable();
    this.timer.remove();
  }

  ngOnDestroy() {
    this.unsubscribeMessages?.();
    this.unsubscribeReadyToEndChat?.();
  }
}
