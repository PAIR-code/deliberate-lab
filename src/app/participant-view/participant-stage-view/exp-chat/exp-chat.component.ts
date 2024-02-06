/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { ChatAboutItems, Message, StageKinds } from 'src/lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { ChatUserMessageComponent } from './chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from './chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from './chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from './mediator-feedback/mediator-feedback.component';
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
  ],
  templateUrl: './exp-chat.component.html',
  styleUrl: './exp-chat.component.scss',
})
export class ExpChatComponent {
  public messages: Signal<Message[]>;
  public stageData: Signal<ChatAboutItems>;
  public message: string = '';

  public participant: Participant;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(StageKinds.groupChat);
    this.stageData = stageData;
    this.participant = participant;

    this.messages = computed(() => {
      return this.stageData().messages;
    });
  }

  sendMessage() {
    this.participant.sendMessage(this.message);
    this.message = '';
  }
}
