import { HttpClient } from '@angular/common/http';
import { Signal, WritableSignal, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Unsubscribe } from 'firebase/firestore';
import { Destroyable } from 'src/app/services/provider.service';
import { assertCast } from './algebraic-data';
import { participantQuery } from './api/queries';
import { Progression, QueryType, SimpleResponse } from './types/api.types';
import { ParticipantExtended, ParticipantsProgression } from './types/participants.types';
import { ExpStage, StageKind } from './types/stages.types';
import { lazyInitWritable } from './utils/angular.utils';
import { firestoreDocSubscription } from './utils/firestore.utils';
import { keyRank, keysRanking } from './utils/object.utils';

/**
 * Handle all participant-related logic for a single user that plays the role of a participant.
 */
export class Participant implements Destroyable {
  public query: QueryType<SimpleResponse<ParticipantExtended>>;
  public userData: Signal<ParticipantExtended | undefined>;

  // Frontend-only signals to help navigation
  public viewingStage: Signal<ExpStage | undefined>; // Current stage the participant is viewing
  public workingOnStage: WritableSignal<ExpStage | undefined>; // Current active stage for the participant
  public commonLastWorkingOnStageName: WritableSignal<string | undefined>; // Last stage that all participants have been working on
  public experimentId: Signal<string | null>; // ID of the experiment this participant is part of
  public everyoneReachedCurrentStage: Signal<boolean>; // Whether all participants have reached the current stage

  private http = inject(HttpClient);
  private router = inject(Router);

  // Firestore subscriptions
  private unsubscribe: Unsubscribe | undefined;

  /**
   *
   * @param participantId ID of the participant that this instance will handle
   * @param viewingStageName name of the stage being viewed by the participant. If not provided, it will follow the workingOnStage signal.
   */
  constructor(
    participantId: Signal<string | undefined>,
    viewingStageName?: Signal<string | undefined>,
  ) {
    // Query data from the backend about this participant
    this.query = participantQuery(this.http, participantId());
    this.userData = computed(() => this.query.data()?.data); // Shortcut to extract query data

    this.experimentId = computed(() => this.userData()?.experimentId ?? null);
    this.commonLastWorkingOnStageName = signal(undefined);

    // Initialize workingOnStage with the last completed stage once the backend data arrives
    this.workingOnStage = lazyInitWritable(this.userData, (data) => {
      const index = Math.min(
        Object.values(data.stageMap).length - 1,
        data.completedStageNames.length,
      );
      return Object.values(data.stageMap)[index];
    });

    if (viewingStageName) {
      this.viewingStage = computed(() => {
        const name = viewingStageName();
        const stageMap = this.userData()?.stageMap;
        if (!stageMap) return undefined;

        if (name && name in stageMap) {
          return stageMap[name];
        }
        // Else, default to the first one
        return Object.values(stageMap)[0];
      });
    } else {
      // Follow the workingOnStage signal by default
      this.viewingStage = computed(this.workingOnStage);
    }

    // Subscribe to Firestore to get real time updates on all participant's progressions
    effect(
      () => {
        this.unsubscribe?.();
        const experimentId = this.experimentId();

        if (experimentId) {
          this.unsubscribe = firestoreDocSubscription<ParticipantsProgression>(
            `participants_progressions/${experimentId}`,
            (data) => {
              if (!data) {
                this.commonLastWorkingOnStageName.set(undefined);
                return;
              }

              const stageMap = untracked(this.userData)?.stageMap ?? {};
              const rank = keysRanking(stageMap);

              // Compute the minimum worked on stage
              const min = Math.min(...Object.values(data.progressions).map((n) => rank[n]));
              this.commonLastWorkingOnStageName.set(Object.keys(stageMap)[min]);
            },
          );
        }
      },
      { allowSignalWrites: true },
    );

    // Everyone reached the current stage when their current stage corresponds to the current one or to later ones.
    this.everyoneReachedCurrentStage = computed(() => {
      const stageMap = this.userData()?.stageMap;
      if (!stageMap) return false;
      return (
        keyRank(stageMap, this.userData()!.workingOnStageName) <=
        keyRank(stageMap, this.commonLastWorkingOnStageName()!)
      );
    });
  }

  nextStep() {
    // TODO: remove this once all old occurrences have been removed
  }

  /** Returns a non empty progression data object if going to the next stage would
   * need to update the backend stage progression state as well.
   */
  getStageProgression(): Progression {
    const stageName = this.workingOnStage()?.name;
    const completedStages = this.userData()?.completedStageNames;

    if (!stageName || !completedStages) {
      return {};
    }

    if (!completedStages.includes(stageName)) {
      return { justFinishedStageName: stageName };
    }

    return {};
  }

  navigateToNextStage() {
    const current = this.viewingStage();
    const userData = this.userData();
    if (!current || !userData) {
      return;
    }

    // Get the next stage in the sequence
    const stageNames = Object.keys(userData.stageMap);
    const currentIndex = stageNames.indexOf(current.name);
    const stage = stageNames[currentIndex + 1];

    if (!stage) {
      return; // No more stages to navigate to
    }

    this.workingOnStage.set(userData.stageMap[stage]);
    this.router.navigate(['/participant', this.userData()?.uid], { queryParams: { stage } });
  }

  /** Returns the current viewing stage and asserts its kind. Throws an error if the cast is incorrect. */
  assertViewingStageCast<T extends StageKind>(kind: T): (ExpStage & { kind: T }) | undefined {
    const viewing = this.viewingStage();

    if (!viewing) {
      return undefined;
    }
    return assertCast(viewing, kind);
  }

  /** Call this method in order to properly unsubscribe from firebase when it is not needed */
  destroy() {
    this.unsubscribe?.();
  }
}
