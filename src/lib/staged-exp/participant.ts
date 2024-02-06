/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { computed, effect, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { Experiment, ExpStage, UserData, ExpDataKinds, UserProfile } from './data-model';
import { Session } from '../session';
import { SavedAppData, ParticipantSession, editParticipant, sendParticipantMessage } from './app';

// TODO:
// Make this cleverly parameterised over the "viewingStage" ExpStage type,
// so that editStageData can make sure it never edits the wrong data kind.
export class Participant {
  public userData: Signal<UserData>;
  public experiment: Signal<Experiment>;
  public viewingStage: Signal<ExpStage>;
  public workingOnStage: Signal<ExpStage>;

  constructor(
    private appData: WritableSignal<SavedAppData>,
    public session: Session<ParticipantSession>,
    public destory?: () => void,
    // public participant: { experiment: string; id: string },
  ) {
    // console.log('------------new Participant ');
    // console.log(this.session.state());
    // console.log(JSON.stringify(this.session.state()));
    this.experiment = computed(() => {
      const experimentId = this.session.state().experiment;
      const experiment = this.appData().experiments[experimentId];
      if (!experiment) {
        throw new Error(`No such experiment name: ${experimentId}`);
      }
      return experiment;
    });
    this.userData = computed(() => {
      const participantId = this.session.state().user;
      const user = this.experiment().participants[participantId];
      if (!user) {
        throw new Error(`No such user id: ${participantId}`);
      }
      return user;
    });

    this.viewingStage = computed(() => {
      if (this.session.state().stage in this.userData().stageMap) {
        return this.userData().stageMap[this.session.state().stage];
      } else {
        return this.userData().stageMap[this.userData().workingOnStageName];
      }
    });
    this.workingOnStage = computed(
      () => this.userData().stageMap[this.userData().workingOnStageName],
    );
  }

  public edit(f: (user: UserData) => UserData | void): void {
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

  setProfile(newUserProfile: UserProfile) {
    this.edit((user) => {
      user.profile = newUserProfile;
    });
  }

  sendMessage(message: string) {
    sendParticipantMessage(
      this.appData,
      { experiment: this.experiment().name, id: this.userData().userId },
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
