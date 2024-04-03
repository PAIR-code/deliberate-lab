import { Component, Input } from '@angular/core';
import { UserMessage } from 'src/lib/staged-exp/data-model';
import { ChatUserProfileComponent } from '../chat-user-profile/chat-user-profile.component';

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
      `${date.getFullYear()} - ${date.getMonth()} - ${date.getDate()}:` +
      ` ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    );
  }
}
