/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { computed, Signal, WritableSignal } from '@angular/core';
import { Session } from '../session';
import { ExperimentExtended } from '../types/experiments.types';
import { ParticipantExtended, ParticipantProfile } from '../types/participants.types';
import { editParticipant, ParticipantSession, SavedAppData, sendParticipantMessage } from './app';
import { ExpDataKinds, ExpStage } from './data-model';

// TODO:
// Make this cleverly parameterised over the "viewingStage" ExpStage type,
// so that editStageData can make sure it never edits the wrong data kind.

// TODO: voir ce que fait cette classe. Elle doit peut-être être refactored...

// TODO: update flow : mutation -> (optimistic update) -> refetch main data
// Backend interaction needed in order for all candidates to be aware of everything.
// NOTE: we candidates pass stages, fetch all stages for all candidates in order to determine if a signa must be sent ?

/** Util class for all interactions possible with a participant */
export class Participant {
  public userData: Signal<ParticipantExtended>;
  public experiment: Signal<ExperimentExtended>;
  public viewingStage: Signal<ExpStage>;
  public workingOnStage: Signal<ExpStage>;

  constructor(
    private appData: WritableSignal<SavedAppData>,
    public session: Session<ParticipantSession>, // XXX: manage the participant id, experiment id, and current stage name through the URL. The binding class is not needed, and the session could do this on its own in the constructor
    public destory?: () => void, // destroy the route binding class and the session on participant destroy
  ) {
    // XXX: here: the participant knows about himself and the stage from the session (which is incorrectly initialized with empty strings. Should be null or undefined)

    // XXX: fetch the experiment from the backend (here it is fetched from the app state) (we already have a query for that)
    this.experiment = computed(() => {
      const experimentId = this.session.state().experiment;
      const experiment = this.appData().experiments[experimentId]; // note: bad practice, all app data is linked to the same signal.
      if (!experiment) {
        throw new Error(`No such experiment name: ${experimentId}`);
      }
      return experiment;
    });

    // XXX: fetch the user data from the backend (we already have a query for that).
    this.userData = computed(() => {
      const participantId = this.session.state().user;
      const user = this.experiment().participants[participantId];
      if (!user) {
        throw new Error(`No such user id: ${participantId}`);
      }
      return user;
    });

    // XXX: the stage data the user is currently viewing (note)
    // ISSUE: must be saved in backend ?
    // ON PEUT REVENIR EN ARRIERE => store max viewing stage, et c'est tout ? NON : utiliser completed stages
    // TODO: viewing stage pas stocké dans le backend. On a la liste des stages complétés pour ça.
    this.viewingStage = computed(() => {
      if (this.session.state().stage in this.userData().stageMap) {
        return this.userData().stageMap[this.session.state().stage];
      } else {
        return this.userData().stageMap[this.userData().workingOnStageName];
      }
    });

    // XXX: extracted current stage, on n'en a pas besoin, ça sera stocké ici et initialisé avec le max stage.
    this.workingOnStage = computed(
      () => this.userData().stageMap[this.userData().workingOnStageName],
    );
  }

  // TODO: update these functions (some of them may even be obsolete with the backend)

  public edit(f: (user: ParticipantExtended) => ParticipantExtended | void): void {
    editParticipant(
      this.appData,
      { experiment: this.session.state().experiment, id: this.session.state().user },
      f,
    );
  }

  setViewingStage(expStageName: string) {
    this.session.edit((session) => {
      session.stage = expStageName;
    });
  }

  setWorkingOnStage(expStageName: string) {
    this.edit((user) => {
      user.workingOnStageName = expStageName;
    });
  }

  // setStageComplete(complete: boolean) {
  //   this.edit((user) => {
  //     user.stageMap[user.workingOnStageName].complete = complete;
  //   });
  // }

  editStageData<T extends ExpDataKinds>(f: (oldExpStage: T) => T | void) {
    this.edit((user) => {
      const maybeNewData = f(user.stageMap[user.workingOnStageName].config as T);
      if (maybeNewData) {
        user.stageMap[user.workingOnStageName].config = maybeNewData;
      }
    });
  }

  setProfile(_newUserProfile: ParticipantProfile) {
    this.edit((_user) => {
      // TODO: use a backend mutation instead
      // user = newUserProfile;
    });
  }

  sendMessage(message: string) {
    sendParticipantMessage(
      this.appData,
      { experiment: this.experiment().name, id: this.userData().uid },
      { stageName: this.workingOnStage().name, message },
    );
  }

  nextStep() {
    let currentStageName = this.viewingStage().name;
    this.edit((u) => {
      if (u.workingOnStageName === currentStageName) {
        const nextStageName = u.futureStageNames.shift();
        if (!nextStageName) {
          return;
        }
        u.completedStageNames.push(u.workingOnStageName);
        u.workingOnStageName = nextStageName;
        currentStageName = nextStageName;
      } else {
        // here, we can assume that u.currentStageName is among one of the completed stages.
        const currentStageIdx = u.completedStageNames.indexOf(currentStageName);
        currentStageName =
          currentStageIdx === u.completedStageNames.length - 1
            ? u.workingOnStageName
            : u.completedStageNames[currentStageIdx + 1];
      }

      this.session.edit((session) => {
        session.stage = currentStageName;
      });
    });
  }
}
