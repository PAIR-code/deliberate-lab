import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Message,
  ParticipantProfileExtended,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind,
  isOfKind,
  lookupTable,
} from '@llm-mediation-experiments/utils';
import { collection, getDocs } from 'firebase/firestore';
import { AppStateService } from 'src/app/services/app-state.service';
import { firestore } from 'src/lib/api/firebase';
import { ExperimentRepository } from 'src/lib/repositories/experiment.repository';
import { bindSignalReRender } from 'src/lib/utils/angular.utils';
import { downloadJsonFile } from 'src/lib/utils/files.utils';
import { MediatorChatComponent } from '../mediator-chat/mediator-chat.component';

@Component({
  selector: 'app-experiment-monitor',
  standalone: true,
  imports: [
    RouterModule,
    RouterLink,
    RouterLinkActive,
    MediatorChatComponent,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './experiment-monitor.component.html',
  styleUrl: './experiment-monitor.component.scss',
})
export class ExperimentMonitorComponent {
  public _experimentId: WritableSignal<string | undefined> = signal(undefined);

  @Input()
  // This one is set by the route parameter
  set experimentId(name: string | undefined) {
    this._experimentId.set(name);
  }

  get experimentId(): Signal<string | undefined> {
    return this._experimentId;
  }

  readonly isOfKind = isOfKind;
  readonly StageKind = StageKind;

  // Helper computed signals
  participants: Signal<ParticipantProfileExtended[]>;
  experiment: Signal<ExperimentRepository | undefined>;
  stages: Signal<StageConfig[]>;
  participantsPerStage: Signal<Record<string, number | undefined>>;

  constructor(
    public router: Router,
    public appState: AppStateService,
  ) {
    // Fetch the participants for this experiment, and dynamically change the list when the experiment changes.
    this.participants = computed(() => {
      const experimentId = this.experimentId();
      if (!experimentId) return [];
      return appState.experimenter.get().experimentParticipants.get(experimentId)();
    });

    // Get the related experiment repository
    this.experiment = computed(() => {
      const experimentId = this.experimentId();
      if (!experimentId) return undefined;
      return appState.experiments.get({ experimentId });
    });

    this.participantsPerStage = computed(() => {
      return this.participants().reduce(
        (acc, p) => {
          acc[p.workingOnStageName] = (acc[p.workingOnStageName] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    });

    this.stages = computed(() =>
      Object.values(this.experiment()?.stageConfigMap ?? {}).map((s) => s()),
    );

    // Fix experiment loading on first login
    bindSignalReRender(this.participants);
  }

  async deleteExperimentAndNavigate() {
    const experiment = this.experiment();
    if (experiment && confirm('⚠️ This will delete the experiment! Are you sure?')) {
      await experiment.delete();
      await this.router.navigate(['/experimenter', 'settings']); // Redirect to settings page.
    }
  }

  /** Download an experiment's data as a single JSON file */
  async downloadExperiment() {
    const experiment = this.experiment()?.experiment();
    const participants = this.participants();
    const configs = this.stages();

    if (!experiment) return;

    const experimentId = experiment.id;

    const stagePublicData = (
      await getDocs(collection(firestore, 'experiments', experimentId, 'publicStageData'))
    ).docs.map((doc) => ({ ...(doc.data() as PublicStageData), name: doc.id }));

    // Get stage answers per participant.
    const stageAnswers = await Promise.all(
      participants.map(async (participant) => {
        return (
          await getDocs(
            collection(
              firestore,
              'experiments',
              experimentId,
              'participants',
              participant.privateId,
              'stages',
            ),
          )
        ).docs.map((doc) => ({ ...(doc.data() as StageAnswer), name: doc.id }));
      }),
    );

    // Get chat data.
    // TODO: technically, there are as many chat copies as there are participants
    // but because we do not change them, we will only download the first copy of each chat here

    const chats = await getDocs(
      collection(
        firestore,
        'experiments',
        experimentId,
        'participants',
        participants[0].privateId,
        'chats',
      ),
    );

    const chatMessages = await Promise.all(
      chats.docs.map((doc) =>
        getDocs(
          collection(
            firestore,
            'experiments',
            experimentId,
            'participants',
            participants[0].privateId,
            'chats',
            doc.id,
            'messages',
          ),
        ),
      ),
    );

    // Lookups
    const publicData = lookupTable(stagePublicData, 'name');
    const answersLookup = stageAnswers.reduce(
      (acc, stageAnswers, index) => {
        const participantId = participants[index].publicId;

        stageAnswers.forEach((stageAnswer) => {
          if (!acc[stageAnswer.name]) acc[stageAnswer.name] = {};

          acc[stageAnswer.name][participantId] = excludeName(stageAnswer) as StageAnswer;
        });
        return acc;
      },
      {} as Record<string, Record<string, StageAnswer>>,
    );

    const data = {
      ...experiment,
      participants,

      stages: configs.map((config) => {
        const stagePublicData = publicData[config.name];
        const cleanedPublicData = stagePublicData ? excludeName(stagePublicData) : undefined;
        const answers = answersLookup[config.name];
        return { config, public: cleanedPublicData, answers };
      }),

      chats: chatMessages.reduce(
        (acc, chat, index) => {
          const messages = chat.docs.map((doc) => doc.data() as Message);
          acc[`chat-${index}`] = messages;
          return acc;
        },
        {} as Record<string, Message[]>,
      ),
    };

    downloadJsonFile(data, `${experiment.name}.json`);
  }
}

/** Helper to cleanup experiment data from redundant stage names */
const excludeName = <T extends { name: string }>(obj: T) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { name, ...rest } = obj;
  return rest;
};
