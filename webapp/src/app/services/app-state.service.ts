import { Injectable, OnDestroy } from '@angular/core';
import { CacheMap, Lazy } from '@llm-mediation-experiments/utils';
import { destroyRepository } from 'src/lib/repositories/base.repository';
import { ChatRepository } from 'src/lib/repositories/chat.repository';
import { ExperimentRepository } from 'src/lib/repositories/experiment.repository';
import { ExperimenterRepository } from 'src/lib/repositories/experimenter.repository';
import { ParticipantRepository } from 'src/lib/repositories/participant.repository';

@Injectable({
  providedIn: 'root',
})
export class AppStateService implements OnDestroy {
  // Repositories
  public readonly experimenter = new Lazy(() => new ExperimenterRepository());
  public readonly experiments = new CacheMap((id: string) => new ExperimentRepository(id));
  public readonly participants = new CacheMap(
    ([expId, partId]: [string, string]) => new ParticipantRepository(expId, partId),
  );
  public readonly chats = new CacheMap(
    ([expId, partId, chatId]: [string, string, string]) =>
      new ChatRepository(expId, partId, chatId),
  );

  constructor() {}

  ngOnDestroy() {
    // Unsubscribe to all repositories when destroying this service
    this.experimenter.clear(destroyRepository);
    this.experiments.clear(destroyRepository);
    this.participants.clear(destroyRepository);
    this.chats.clear(destroyRepository);
  }
}
