/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import {
  Component,
  EnvironmentInjector,
  Input,
  Signal,
  computed,
  effect,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  ChatKind,
  GroupChatStageConfig,
  GroupChatStagePublicData,
  ITEMS,
  ItemPair,
  StageKind,
  assertCast,
  getDefaultItemPair,
} from '@llm-mediation-experiments/utils';

import { AppStateService } from 'src/app/services/app-state.service';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';
import { ChatRepository } from 'src/lib/repositories/chat.repository';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatUserProfileComponent } from './chat-user-profile/chat-user-profile.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';

// const TIMER_SECONDS = 60; // 1 minute between item pairs for discussions

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

    runInInjectionContext(this.injector, () => {
      // On config change, extract the relevant chat repository and recompute signals
      effect(() => {
        const config = this.stage.config();

        // Extract the relevant chat repository for this chat
        this.chat = this.appState.chats.get({
          chatId: config.chatId,
          experimentId: this.participantService.experimentId()!,
          participantId: this.participantService.participantId()!,
        });

        this.readyToEndChat = computed(() => this.chat!.chat()?.readyToEndChat ?? false);
        this.currentRatingsIndex = computed(() => {
          return this.stage.public!().chatData.currentRatingIndex ?? 0;
        });

        // Initialize the current rating to discuss with the first available pair
        const { item1, item2 } = config.chatConfig.ratingsToDiscuss[0];
        this.currentRatingsToDiscuss = signal({ item1, item2 });
        this.currentRatingsToDiscuss = computed(
          () => config.chatConfig.ratingsToDiscuss[this.currentRatingsIndex()],
        );
      });

      effect(() => {
        // Only if we are currently working on this stage
        if (this.participantService.workingOnStageName() !== this.stage.config().name) return;
        this.currentRatingsIndex(); // Trigger reactivity when the currentRatingsIndex changes
        this.chat?.markReadyToEndChat(false); // Reset readyToEndChat when the items to discuss change
        // this.timer.reset(TIMER_SECONDS); // Reset the timer
      });

      if (this.participantService.workingOnStageName() === this.stage.config().name) {
        // Automatic next step progression when the chat has ended
        effect(() => {
          const config = this.stage.config();
          const pub = this.stage.public!();
          if (chatReadyToEnd(config, pub)) this.nextStep();
        });
      }
    });
  }
  get stage() {
    return this._stage as CastViewingStage<StageKind.GroupChat>;
  }

  public everyoneReachedTheChat: Signal<boolean>;
  public readyToEndChat: Signal<boolean> = signal(false);

  // Extracted stage data
  public currentRatingsIndex: Signal<number>;
  public currentRatingsToDiscuss: Signal<ItemPair>;

  // Message mutation & form
  public message = new FormControl<string>('', Validators.required);

  // public timer = localStorageTimer('chat-timer', TIMER_SECONDS, () => this.toggleEndChat()); // 1 minute timer
  public chat: ChatRepository | undefined;

  constructor(
    private appState: AppStateService,
    public participantService: ParticipantService,
    private injector: EnvironmentInjector,
  ) {
    // Extract stage data
    this.everyoneReachedTheChat = signal(false);
    this.currentRatingsIndex = signal(0);
    this.currentRatingsToDiscuss = signal(getDefaultItemPair());
  }

  isSilent() {
    return false;
    // return this.stageData().isSilent !== false;
  }

  async sendMessage() {
    if (!this.message.valid || !this.message.value) return;
    this.chat?.sendUserMessage(this.message.value);
    this.message.setValue('');
  }

  toggleEndChat() {
    const ready = this.readyToEndChat();

    this.chat?.markReadyToEndChat(ready);

    if (ready) this.message.disable();
    else this.message.enable();
    // this.timer.remove();
  }

  async nextStep() {
    await this.participantService.workOnNextStage();
    // this.timer.remove();
  }
}

const chatReadyToEnd = (config: GroupChatStageConfig, pub: GroupChatStagePublicData) => {
  // If someone is not ready to end, return false
  if (Object.values(pub.readyToEndChat).some((bool) => !bool)) return false;

  // If this is a chat about items, all items must have been discussed
  if (config.chatConfig.kind === ChatKind.ChatAboutItems) {
    if (
      assertCast(pub.chatData, ChatKind.ChatAboutItems).currentRatingIndex <
      config.chatConfig.ratingsToDiscuss.length
    )
      return false;
  }

  // If all checks passed, the chat stage is ready to end
  return true;
};
