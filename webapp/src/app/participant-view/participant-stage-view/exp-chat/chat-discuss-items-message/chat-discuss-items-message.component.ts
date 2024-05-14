import { Component, Input } from '@angular/core';
import { DiscussItemsMessage, ITEMS, dateStrOfTimestamp } from '@llm-mediation-experiments/utils';

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
  readonly ITEMS = ITEMS;
}
