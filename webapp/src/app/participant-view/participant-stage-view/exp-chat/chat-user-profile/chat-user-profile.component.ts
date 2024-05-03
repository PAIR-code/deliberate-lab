import { Component, Input } from '@angular/core';
import { ParticipantProfile } from '@llm-mediation-experiments/utils';

@Component({
  selector: 'app-chat-user-profile',
  standalone: true,
  imports: [],
  templateUrl: './chat-user-profile.component.html',
  styleUrl: './chat-user-profile.component.scss',
})
export class ChatUserProfileComponent {
  @Input() profile!: ParticipantProfile;
}
