import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import {
  ChatAboutItems,
  ExpStageChatAboutItems,
  Message,
  UserData,
  fakeChat,
} from 'src/lib/staged-exp/data-model';
import { AppStateService } from '../../services/app-state.service';
import { ChatUserMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-user-message/chat-user-message.component';
import { ChatDiscussItemsMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-discuss-items-message/chat-discuss-items-message.component';
import { ChatMediatorMessageComponent } from '../../participant-view/participant-stage-view/exp-chat/chat-mediator-message/chat-mediator-message.component';
import { MediatorFeedbackComponent } from '../../participant-view/participant-stage-view/exp-chat/mediator-feedback/mediator-feedback.component';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { sendMediatorGroupMessage } from 'src/lib/staged-exp/app';

@Component({
  selector: 'app-mediator-chat',
  standalone: true,
  imports: [
    ChatUserMessageComponent,
    ChatDiscussItemsMessageComponent,
    ChatMediatorMessageComponent,
    MediatorFeedbackComponent,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
  ],
  templateUrl: './mediator-chat.component.html',
  styleUrl: './mediator-chat.component.scss',
})
export class MediatorChatComponent {
  roomName: WritableSignal<string> = signal('');

  @Input() experiment?: Signal<string>;
  @Input() participants?: Signal<UserData[]>;

  @Input()
  set chatRoomName(name: string) {
    this.roomName.set(name);
  }

  public messages: Signal<Message[]>;
  public message: string = '';

  constructor(private appStateService: AppStateService) {
    this.messages = computed(() => {
      if (this.roomName() === '' || !this.experiment || !this.participants) {
        return [];
      }
      // TODO: think about how to show a merged view in cases when
      // partcipants have different views...
      const participant0 = this.participants()[0];
      const chat = participant0.stageMap[this.roomName()].config as ChatAboutItems;
      return chat.messages;
    });
  }

  sendMessage() {
    if (!this.experiment) {
      throw new Error('Tried to send a message without knowing the experiment');
    }
    sendMediatorGroupMessage(this.appStateService.data, this.experiment(), {
      stageName: this.roomName(),
      message: this.message,
    });
    this.message = '';
  }
}
