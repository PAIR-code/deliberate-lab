import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import {
  FAKE_EMPTY_USERID,
  UserMessage,
  UserProfile,
  fakeEmptyMessage,
  fakeEmptyProfile,
} from 'src/lib/staged-exp/data-model';
import { ChatUserProfileComponent } from '../chat-user-profile/chat-user-profile.component';
import { AppStateService } from 'src/app/services/app-state.service';

@Component({
  selector: 'app-chat-user-message',
  standalone: true,
  imports: [ChatUserProfileComponent],
  templateUrl: './chat-user-message.component.html',
  styleUrl: './chat-user-message.component.scss',
})
export class ChatUserMessageComponent {
  @Input() message!: UserMessage;

  dateStrOfTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return (
      `${date.getFullYear()} - ${date.getMonth() - date.getDate()}:` +
      ` ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    );
  }
}
