import { Component, Input } from '@angular/core';
import { DiscussItemsMessage } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-chat-discuss-items-message',
  standalone: true,
  imports: [],
  templateUrl: './chat-discuss-items-message.component.html',
  styleUrl: './chat-discuss-items-message.component.scss'
})
export class ChatDiscussItemsMessageComponent {
  @Input() discussItemsMessage!: DiscussItemsMessage;

  dateStrOfTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return (
      `${date.getFullYear()} - ${date.getMonth()} - ${date.getDate()}:` +
      ` ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    );
  }
}
