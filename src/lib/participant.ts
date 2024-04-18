import { HttpClient } from '@angular/common/http';
import { Signal, WritableSignal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { assertCast } from './algebraic-data';
import { participantQuery } from './api/queries';
import { Progression, QueryType, SimpleResponse } from './types/api.types';
import { ParticipantExtended } from './types/participants.types';
import { ExpStage, StageKind } from './types/stages.types';
import { lazyInitWritable } from './utils/angular.utils';

export class Participant {
  public query: QueryType<SimpleResponse<ParticipantExtended>>;
  public userData: Signal<ParticipantExtended | undefined>;

  // Frontend-only signals to help navigation
  public viewingStage: Signal<ExpStage | undefined>; // Current stage the participant is viewing
  public workingOnStage: WritableSignal<ExpStage | undefined>; // Current active stage for the participant

  private http = inject(HttpClient);
  private router = inject(Router);

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
}
