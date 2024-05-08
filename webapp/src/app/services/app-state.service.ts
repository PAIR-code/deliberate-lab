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
  public readonly experiments = new CacheMap(createExperimentRepository);
  public readonly participants = new CacheMap(createParticipantRepository);
  public readonly chats = new CacheMap(createChatRepository);

  constructor() {}

  ngOnDestroy() {
    // Unsubscribe to all repositories when destroying this service
    this.experimenter.clear(destroyRepository);
    this.experiments.clear(destroyRepository);
    this.participants.clear(destroyRepository);
    this.chats.clear(destroyRepository);
  }
}

// Helpers
interface CreateExperimentRepositoryParams {
  experimentId: string;
}
const createExperimentRepository = ({ experimentId }: CreateExperimentRepositoryParams) =>
  new ExperimentRepository(experimentId);

interface CreateParticipantRepositoryParams {
  experimentId: string;
  participantId: string;
}
const createParticipantRepository = ({
  experimentId,
  participantId,
}: CreateParticipantRepositoryParams) => new ParticipantRepository(experimentId, participantId);

interface CreateChatRepositoryParams {
  experimentId: string;
  participantId: string;
  chatId: string;
}
const createChatRepository = ({
  experimentId,
  participantId,
  chatId,
}: CreateChatRepositoryParams) => new ChatRepository(experimentId, participantId, chatId);
