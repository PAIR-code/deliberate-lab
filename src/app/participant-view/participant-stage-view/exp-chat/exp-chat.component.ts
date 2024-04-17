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
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
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
import { MutationType } from 'src/lib/types/api.types';
import { ReadyToEndChat } from 'src/lib/types/chats.types';
import { ItemPair } from 'src/lib/types/items.types';
import { Message, UserMessageMutationData } from 'src/lib/types/messages.types';
import { ParticipantExtended } from 'src/lib/types/participants.types';
import { ExpStageChatAboutItems, StageKind } from 'src/lib/types/stages.types';
import { chatMessagesSubscription, firestoreDocSubscription } from 'src/lib/utils/firestore.utils';
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
  public ratingsToDiscuss: Signal<ItemPair[]>;
  public currentRatingsToDiscuss: Signal<ItemPair>;

  // Queries
  private http = inject(HttpClient);
  private client = injectQueryClient();

  // Message subscription
  public messages: WritableSignal<Message[]>;
  private unsubscribeMessages: Unsubscribe | undefined;
  // Ready to end chat subscription
  public everyoneFinishedTheChat: WritableSignal<boolean>;
  private unsubscribeReadyToEndChat: Unsubscribe | undefined;

  // Message mutation & form
  public messageMutation: MutationType<UserMessageMutationData, object>;
  public message = new FormControl<string>('', Validators.required);

  // Chat completion mutation
  public finishChatMutation = updateChatStageMutation(this.http, this.client, () =>
    this.participant.navigateToNextStage(),
  );

  public toggleMutation = toggleChatMutation(this.http);
  public readyToEndChat: WritableSignal<boolean> = signal(false); // Frontend-only, no need to have fine-grained backend sync for this

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
    this.unsubscribeMessages = chatMessagesSubscription(this.stage.config.chatId, (m) => {
      this.messages.set(extendUntilMatch(this.messages(), m.reverse(), 'uid'));
    });

    // Firestore subscription for ready to end chat
    this.everyoneFinishedTheChat = signal(false);
    this.unsubscribeReadyToEndChat = firestoreDocSubscription<ReadyToEndChat>(
      `participants_ready_to_end_chat/${this.stage.config.chatId}`,
      (d) => {
        this.everyoneFinishedTheChat.set(
          d ? Object.values(d.readyToEndChat).every((v) => v) : false,
        );
      },
    );

    // Message mutation creation
    this.messageMutation = userMessageMutation(this.http);

    // When all users are ready, and if the current user is still on the stage, finish the chat and move to the next stage
    effect(() => {
      if (
        this.everyoneFinishedTheChat() &&
        this.participant.workingOnStage()?.name === this.stage.name
      ) {
        this.finishChatMutation.mutate({
          uid: this.participant.userData()!.uid,
          name: this.stage.name,
          data: { readyToEndChat: true },
          ...this.participant.getStageProgression(),
        });
      }
    });
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

  updateTogleValue(updatedValue: MatSlideToggleChange) {
    this.readyToEndChat.set(updatedValue.checked);

    this.toggleMutation.mutate({
      chatId: this.stage.config.chatId,
      participantId: this.participant.userData()!.uid,
      readyToEndChat: updatedValue.checked,
    });

    if (updatedValue.checked) this.message.disable();
    else this.message.enable();
  }

  ngOnDestroy() {
    this.unsubscribeMessages?.();
    this.unsubscribeReadyToEndChat?.();
  }
}
