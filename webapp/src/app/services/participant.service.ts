import { Injectable, Signal, computed, signal } from '@angular/core';
import { ChatRepository } from 'src/lib/repositories/chat.repository';
import { ExperimentRepository } from 'src/lib/repositories/experiment.repository';
import { ParticipantRepository } from 'src/lib/repositories/participant.repository';
import { AppStateService } from './app-state.service';

/** Helper service that exposes participant and experiment data from the app state service in a convenient way.
 * This service does not own any data, only references. It is safe to inject and destroy at any component level.
 */
@Injectable()
export class ParticipantService {
  // Binding signals
  public participantId: Signal<string | undefined> = signal(undefined);
  public experimentId: Signal<string | undefined> = signal(undefined);
  public viewingStageName: Signal<string | undefined> = signal(undefined);

  // Repository signals
  public participant: Signal<ParticipantRepository | undefined> = signal(undefined);
  public experiment: Signal<ExperimentRepository | undefined> = signal(undefined);

  constructor(public readonly appState: AppStateService) {}

  /** Initialize the service with new parameters */
  initialize(
    participantId: Signal<string | undefined>,
    experimentId: Signal<string | undefined>,
    viewingStageName: Signal<string | undefined>,
  ) {
    // Set the signals
    this.participantId = participantId;
    this.experimentId = experimentId;
    this.viewingStageName = viewingStageName;

    // Regenerate the computed repositories
    this.participant = computed(() => {
      const participantId = this.participantId();
      const experimentId = this.experimentId();
      if (!participantId || !experimentId) return undefined;

      return this.appState.participants.get({ experimentId, participantId });
    });

    this.experiment = computed(() => {
      const experimentId = this.experimentId();
      if (!experimentId) return undefined;

      return this.appState.experiments.get({ experimentId });
    });
  }

  /** Get a chat repository from its ID, bound to the current experiment and participant */
  getChat(chatId: Signal<string | undefined>): Signal<ChatRepository | undefined> {
    return computed(() => {
      const participantId = this.participantId();
      const experimentId = this.experimentId();
      const id = chatId();
      if (!participantId || !experimentId || !id) return undefined;

      return this.appState.chats.get({ experimentId, participantId, chatId: id });
    });
  }
}
