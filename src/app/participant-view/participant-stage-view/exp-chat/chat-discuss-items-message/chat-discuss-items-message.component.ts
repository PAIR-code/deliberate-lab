import { Component, Input } from '@angular/core';
import { DiscussItemsMessage } from 'src/lib/types/messages.types';
import { dateStrOfTimestamp } from 'src/lib/utils/string.utils';

@Component({
  selector: 'app-chat-discuss-items-message',
  standalone: true,
  imports: [],
  templateUrl: './chat-discuss-items-message.component.html',
  styleUrl: './chat-discuss-items-message.component.scss',
})
export class ChatDiscussItemsMessageComponent {
  @Input() discussItemsMessage!: DiscussItemsMessage;

  readonly dateStrOfTimestamp = dateStrOfTimestamp;
}
