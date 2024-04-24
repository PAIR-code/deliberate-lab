import { Component, Input } from '@angular/core';
import { MediatorMessage } from 'src/lib/types/messages.types';
import { dateStrOfTimestamp } from 'src/lib/utils/string.utils';
import { ChatMediatorProfileComponent } from '../chat-mediator-profile/chat-mediator-profile.component';

@Component({
  selector: 'app-chat-mediator-message',
  standalone: true,
  imports: [ChatMediatorProfileComponent],
  templateUrl: './chat-mediator-message.component.html',
  styleUrl: './chat-mediator-message.component.scss',
})
export class ChatMediatorMessageComponent {
  @Input() message!: MediatorMessage;

  readonly dateStrOfTimestamp = dateStrOfTimestamp;
}
