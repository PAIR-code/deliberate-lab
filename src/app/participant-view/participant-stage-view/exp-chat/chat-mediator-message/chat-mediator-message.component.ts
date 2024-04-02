import { Component, Input } from '@angular/core';
import { ChatMediatorProfileComponent } from '../chat-mediator-profile/chat-mediator-profile.component';
import { MediatorMessage } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-chat-mediator-message',
  standalone: true,
  imports: [ChatMediatorProfileComponent],
  templateUrl: './chat-mediator-message.component.html',
  styleUrl: './chat-mediator-message.component.scss',
})
export class ChatMediatorMessageComponent {
  @Input() message!: MediatorMessage;

  dateStrOfTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return (
      `${date.getFullYear()} - ${date.getMonth()} - ${date.getDate()}:` +
      ` ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    );
  }
}
