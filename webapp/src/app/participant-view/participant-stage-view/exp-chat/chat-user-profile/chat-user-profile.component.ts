import { Component, Input } from '@angular/core';
import { UserProfile } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-chat-user-profile',
  standalone: true,
  imports: [],
  templateUrl: './chat-user-profile.component.html',
  styleUrl: './chat-user-profile.component.scss',
})
export class ChatUserProfileComponent {
  @Input() profile!: UserProfile;
}
