/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed, effect } from '@angular/core';
import { ChatAboutItems, ExpStageChatAboutItems, Item, ItemPair, Message, StageKinds, UserData } from 'src/lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';
import { MatSlideToggleChange, MatSlideToggleModule} from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Participant } from 'src/lib/staged-exp/participant';
import { ChatUserProfileComponent } from './chat-user-profile/chat-user-profile.component';
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
export class ExpChatComponent {
  public messages: Signal<Message[]>;
  public stageData: Signal<ChatAboutItems>;
  public message: string = '';

  public participant: Participant;
  public otherParticipants: Signal<UserData[]>;
  public everyoneReachedTheChat: Signal<boolean>;
  public everyoneFinishedTheChat: Signal<boolean>;
  public ratingsToDiscuss: Signal<ItemPair[]>;
  public currentRatingsToDiscuss: Signal<ItemPair>;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(StageKinds.groupChat);
    this.stageData = stageData;
    this.participant = participant;

    this.messages = computed(() => {
      return this.stageData().messages;
    });

    this.otherParticipants = computed(() => {
      const thisUserId = this.participant.userData().userId;
      const allUsers = Object.values(this.participant.experiment().participants);
      return allUsers.filter((u) => u.userId !== thisUserId);
    });

    this.everyoneReachedTheChat = computed(() => {
      const users = Object.values(this.participant.experiment().participants);
      return users.map((userData) => userData.workingOnStageName).every((n) => n === this.participant.userData().workingOnStageName);
    });

    this.everyoneFinishedTheChat = computed(() => {
      // const users = Object.values(this.participant.experiment().participants);
      // return users.every((userData) => {
      //   const otherUserChatStage = userData.stageMap[this.stageData.name] as ExpStageChatAboutItems;
      //   return otherUserChatStage.config.readyToEndChat;        
      // });
      const participantsReady: UserData[] = [];
      if (this.stageData().readyToEndChat) {
        participantsReady.push(this.participant.userData());
      }
      this.otherParticipants().forEach((p) => {
        const stage = p.stageMap[this.participant.userData().workingOnStageName].config as ChatAboutItems;
        if (stage.readyToEndChat) {
          participantsReady.push(p);
        }
      });
      const isReady = participantsReady.length === (this.otherParticipants().length + 1);

      // Allow "Next" to be pushed.
      if (isReady) {
        const allUsers = Object.values(this.participant.experiment().participants);
        for (const user of allUsers) {
            user.allowedStageProgressionMap[user.workingOnStageName] = true;
        }
      }
      return isReady;
    });

    effect(() => {
      if(this.everyoneFinishedTheChat()) {
        this.participant.nextStep();
      }
    }, { allowSignalWrites: true });

    this.ratingsToDiscuss = computed(() => {
      return this.stageData().ratingsToDiscuss;
    });

    this.currentRatingsToDiscuss = computed(() => {
      // last item in the array
      return this.ratingsToDiscuss()[this.ratingsToDiscuss().length - 1];
    });

  }

  isSilent() {
    return (this.stageData().isSilent !== false);
  }

  sendMessage() {
    this.participant.sendMessage(this.message);
    this.message = '';
    this.stageData().isSilent = false;
  }

  updateToogleValue(updatedValue: MatSlideToggleChange) {
    this.participant.editStageData<ChatAboutItems>((d) => {
      d.readyToEndChat = updatedValue.checked;
    });
    // console.log('this.everyoneFinishedTheChat()', this.everyoneFinishedTheChat());
  }
}
