import { Component, Input } from '@angular/core';
import { UserMessage } from 'src/lib/types/messages.types';
import { dateStrOfTimestamp } from 'src/lib/utils/string.utils';
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

  readonly dateStrOfTimestamp = dateStrOfTimestamp;
}
