/**
 * Helper service that exposes participant and experiment data from the app state service in a convenient bundled way.
 */

import { Injectable, Signal, computed, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import {
  ParticipantProfile,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind,
} from '@llm-mediation-experiments/utils';
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

  // Convenience signal to agregate stage data
  // This object can be passed directly to subcomponents that need all stage reactive data
  public viewingStage: Signal<ViewingStage | undefined> = signal(undefined);

  public otherParticipants: Signal<ParticipantProfile[]> = signal([]);

  // Stage status signals
  public completedStageNames: Signal<string[]> = signal([]);
  public workingOnStageName: Signal<string | undefined> = signal(undefined);
  public futureStageNames: Signal<string[]> = signal([]);

  constructor(
    public readonly appState: AppStateService,
    private router: Router,
  ) {}

  /** Initialize the service with the participant and experiment IDs */
  initialize(
    experimentId: Signal<string | undefined>,
    participantId: Signal<string | undefined>,
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

    // Bundle all stage data together. This attribute has 2 nested signals:
    // - The first one changes when the viewing stage name changes
    // - The individual nested ones track individual config, public data and answer changes for the current stage
    this.viewingStage = computed(() => {
      const currentStage = this.viewingStageName();
      const experiment = this.experiment();
      const participant = this.participant();

      if (!currentStage || !experiment || !participant || experiment.isLoading()) return;

      const config = experiment.stageConfigMap[currentStage];
      const publicData = experiment.publicStageDataMap[currentStage];
      const answers = participant.stageAnswers[currentStage];
      const kind = untracked(config).kind;

      return {
        kind,
        config,
        public: publicData ?? signal(undefined),
        answers: answers ?? signal(undefined),
      };
    });

    // Recompute the stage status signals
    this.workingOnStageName = computed(() => {
      const participant = this.participant();
      return participant?.profile()?.workingOnStageName;
    });

    this.completedStageNames = computed(() => {
      const participant = this.participant();
      const experiment = this.experiment();
      const workingOnStageName = this.workingOnStageName();
      if (!participant || !experiment || !workingOnStageName) return [];

      return experiment.stageNames().slice(0, experiment.stageNames().indexOf(workingOnStageName));
    });

    this.futureStageNames = computed(() => {
      const participant = this.participant();
      const experiment = this.experiment();
      const workingOnStageName = this.workingOnStageName();
      if (!participant || !experiment || !workingOnStageName) return [];

      return experiment.stageNames().slice(experiment.stageNames().indexOf(workingOnStageName) + 1);
    });

    this.otherParticipants = computed(() =>
      Object.values(this.experiment()?.experiment()?.participants ?? {})
        .filter(({ publicId }) => publicId !== this.participant()?.profile()?.publicId)
        .sort((a, b) => a.publicId.localeCompare(b.publicId)),
    );
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

  /** Update the participant's workingOnStageName to the next stage
   * @rights Participant
   */
  async workOnNextStage() {
    const nextStage = this.futureStageNames()[0];

    if (!nextStage) return;
    await this.participant()?.workOnStage(nextStage);
    await this.router.navigate(['/participant', this.experimentId()!, this.participantId()!], {
      queryParams: { stage: nextStage },
    });
  }
}

// ********************************************************************************************* //
//                              HELPER TYPES AND CASTING FUNCTIONS                               //
// ********************************************************************************************* //

/** ViewingStage's signals, cast to a specific stage kind. */
export interface CastViewingStage<K extends StageKind> {
  kind: K;
  config: Signal<StageConfig & { kind: K }>;
  public: Signal<PublicStageData & { kind: K }>; // NOTE : public data always exists, so if the cast is successful, it will never be undefined
  answers: Signal<(StageAnswer & { kind: K }) | undefined>;
}

/** Object that exposes a stage's given config, public data and participant answers all at once. */
export interface ViewingStage {
  kind: StageKind;
  config: Signal<StageConfig>;
  public: Signal<PublicStageData | undefined>;
  answers: Signal<StageAnswer | undefined>;
}

/** Safely cast the full stage bundle signals to a specific stage kind */
export const assertCastStageSignals = <K extends StageKind>(
  viewingStage: ViewingStage | undefined,
  kind: K,
) => {
  if (!viewingStage) throw new Error(`Test is undefined`);
  if (viewingStage?.kind !== kind)
    throw new Error(`Wrong kind ${viewingStage?.kind} for expected kind ${kind}`);

  return viewingStage as CastViewingStage<K>;
};
