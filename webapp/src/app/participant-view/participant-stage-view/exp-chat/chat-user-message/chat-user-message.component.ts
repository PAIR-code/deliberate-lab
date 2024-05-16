import { Component, Inject, Input, Signal, computed } from '@angular/core';
import {
  ParticipantExtended,
  UserMessage,
  dateStrOfTimestamp,
  lookupTable,
} from '@llm-mediation-experiments/utils';
import { EXPERIMENT_PROVIDER_TOKEN, ExperimentProvider } from 'src/lib/provider-tokens';
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

  lookup: Signal<Record<string, ParticipantExtended>>;

  constructor(@Inject(EXPERIMENT_PROVIDER_TOKEN) experimentProvider: ExperimentProvider) {
    this.lookup = computed(() =>
      lookupTable(experimentProvider.get()()?.participants ?? [], 'uid'),
    );
  }

  readonly dateStrOfTimestamp = dateStrOfTimestamp;
}
