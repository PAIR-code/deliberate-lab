/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ITEMS, ItemPair, StageKind, getDefaultItemPair } from '@llm-mediation-experiments/utils';

import { AppStateService } from 'src/app/services/app-state.service';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';
import { ChatRepository } from 'src/lib/repositories/chat.repository';
import { localStorageTimer, subscribeSignal } from 'src/lib/utils/angular.utils';
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
export class ExpChatComponent {
  private _stage?: CastViewingStage<StageKind.GroupChat>;
  readonly ITEMS = ITEMS;

  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true })
  set stage(value: CastViewingStage<StageKind.GroupChat>) {
    this._stage = value;

    this.everyoneReachedTheChat = computed(() =>
      this.participantService.experiment()!.everyoneReachedStage(this.stage.config().name)(),
    );

    // On config change, extract the relevant chat repository
    subscribeSignal(this.stage.config, (config) => {
      // Extract the relevant chat repository for this chat
      this.chat = this.appState.chats.get({
        chatId: config.chatId,
        experimentId: this.participantService.experimentId()!,
        participantId: this.participantService.participantId()!,
      });

      // Initialize the current rating to discuss with the first available pair
      const { item1, item2 } = config.chatConfig.ratingsToDiscuss[0];
      this.currentRatingsToDiscuss = signal({ item1, item2 });
    });
  }
  get stage() {
    return this._stage as CastViewingStage<StageKind.GroupChat>;
  }

  public everyoneReachedTheChat: Signal<boolean>;
  public readyToEndChat = signal(false);

  // Extracted stage data (needed ?)
  public currentRatingsToDiscuss: WritableSignal<ItemPair>;

  // Message mutation & form
  public message = new FormControl<string>('', Validators.required);

  public timer = localStorageTimer('chat-timer', TIMER_SECONDS, () => this.toggleEndChat()); // 1 minute timer
  public chat: ChatRepository | undefined;

  constructor(
    private appState: AppStateService,
    public participantService: ParticipantService,
  ) {
    // Extract stage data
    this.everyoneReachedTheChat = signal(false);
    this.currentRatingsToDiscuss = signal(getDefaultItemPair());
  }

  isSilent() {
    return false;
    // return this.stageData().isSilent !== false;
  }

  sendMessage() {
    if (!this.message.valid) return;

    // TODO: use new backend
    // this.messageMutation.mutate({
    //   chatId: this.stage.config.chatId,
    //   text: this.message.value!,
    //   fromUserId: this.participant.userData()!.uid,
    // });
    this.message.setValue('');
  }

  toggleEndChat() {
    if (this.readyToEndChat()) return;
    // TODO: use new backend
    // this.toggleMutation.mutate({
    //   chatId: this.stage.config.chatId,
    //   participantId: this.participant.userData()!.uid,
    //   readyToEndChat: true,
    // });

    this.message.disable();
    this.timer.remove();
  }
}

// TODO: faire fonctionner le reste du html, puis go courses.
// ensuite yaura les petits "sous-messages" à voir.
