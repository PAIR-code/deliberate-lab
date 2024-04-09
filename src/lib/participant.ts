import { HttpClient } from '@angular/common/http';
import { Signal, WritableSignal, computed, inject } from '@angular/core';
import { assertCast } from './algebraic-data';
import { participantQuery } from './api/queries';
import { ExpStage, StageKinds } from './staged-exp/data-model';
import { QueryType, SimpleResponse } from './types/api.types';
import { ParticipantExtended } from './types/participants.types';
import { lazyInitWritable } from './utils/angular.utils';

export class Participant {
  public query: QueryType<SimpleResponse<ParticipantExtended>>;
  public userData: Signal<ParticipantExtended | undefined>;

  // Frontend-only signals to help navigation
  public viewingStage: Signal<ExpStage | undefined>; // Current stage the participant is viewing
  public workingOnStage: WritableSignal<ExpStage | undefined>; // Current active stage for the participant
  public canViewNextStage: Signal<boolean>; // Whether the participant can view the next stage (has finished it, or can skip it)

  private http = inject(HttpClient);

  /**
   *
   * @param participantId ID of the participant that this instance will handle
   * @param viewingStageName name of the stage being viewed by the participant. If not provided, it will follow the workingOnStage signal.
   */
  constructor(
    private participantId: Signal<string | undefined>,
    private viewingStageName?: Signal<string | undefined>,
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

    this.canViewNextStage = computed(() => {
      const viewing = this.viewingStage();
      if (!viewing) return false;

      const data = this.userData();

      // Check if the participant has completed the stage
      // TODO: find a different way to synchronize how users can all advance to the next stage
      // (similar to chat message synchronization)
      return (
        data?.completedStageNames.includes(viewing.name) ||
        data?.allowedStageProgressionMap[viewing.name] === true
      );
    });
  }

  nextStep() {
    // TODO: remove this once all old occurrences have been removed
  }

  navigateToNextStage() {
    // TODO: navigate to the next stage, and handle marking old stages as done
  }

  /** Returns the current viewing stage and asserts its kind. Throws an error if the cast is incorrect. */
  assertViewingStageCast<T extends StageKinds>(kind: T): (ExpStage & { kind: T }) | undefined {
    const viewing = this.viewingStage();

    if (!viewing) {
      return undefined;
    }
    return assertCast(viewing, kind);
  }
}
