import { Component, Input, Signal, computed } from '@angular/core';
import {
  ParticipantProfile,
  UserMessage,
  dateStrOfTimestamp,
} from '@llm-mediation-experiments/utils';
import { ParticipantService } from 'src/app/services/participant.service';
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

  participants: Signal<Record<string, ParticipantProfile>>;

  constructor(participantService: ParticipantService) {
    this.participants = computed(
      () => participantService.experiment()?.experiment()?.participants ?? {},
    );
  }

  readonly dateStrOfTimestamp = dateStrOfTimestamp;
}
