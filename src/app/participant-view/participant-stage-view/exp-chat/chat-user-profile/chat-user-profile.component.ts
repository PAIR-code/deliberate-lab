import { Component, Input } from '@angular/core';
import { ParticipantProfile } from 'src/lib/types/participants.types';

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
