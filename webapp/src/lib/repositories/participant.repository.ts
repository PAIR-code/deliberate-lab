import { Signal, WritableSignal, signal } from '@angular/core';
import {
  ParticipantProfile,
  ParticipantProfileBase,
  QuestionAnswer,
  StageAnswer,
  StageKind,
  Votes,
  lookupTable,
} from '@llm-mediation-experiments/utils';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { updateStageCallable } from '../api/callables';
import { firestore } from '../api/firebase';
import { BaseRepository } from './base.repository';

export class ParticipantRepository extends BaseRepository {
  // Internal writable signals
  private _profile: WritableSignal<ParticipantProfile | undefined> = signal(undefined);
  private _stageAnswers: Record<string, WritableSignal<StageAnswer> | undefined> = {};

  // Expose the signals as read-only
  public get profile(): Signal<ParticipantProfile | undefined> {
    return this._profile;
  }

  public get stageAnswers(): Record<string, Signal<StageAnswer> | undefined> {
    return this._stageAnswers;
  }

  /**
   * @param experimentId Experiment unique identifier (firestore document id)
   * @param participantId Participant unique identifier (firestore document id)
   */
  constructor(
    public readonly experimentId: string,
    public readonly participantId: string,
  ) {
    super();

    // Subscribe to the participant profile
    this.unsubscribe.push(
      onSnapshot(
        doc(firestore, 'experiments', experimentId, 'participants', participantId),
        (doc) => {
          this._profile.set(doc.data() as ParticipantProfile);
        },
      ),
    );

    // Subscribe to the stage answers
    this.unsubscribe.push(
      onSnapshot(
        collection(firestore, 'experiments', experimentId, 'participants', participantId, 'stages'),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) changedDocs = snapshot.docs;

          // Update the public stage data signals
          changedDocs.forEach((doc) => {
            if (!this._stageAnswers[doc.id])
              this._stageAnswers[doc.id] = signal(doc.data() as StageAnswer);
            else this._stageAnswers[doc.id]!.set(doc.data() as StageAnswer);
          });
        },
      ),
    );
  }

  // ******************************************************************************************* //
  //                                          MUTATIONS                                          //
  // ******************************************************************************************* //

  /** Update this participants's profile and acceptance of the Terms of Service.
   * @rights Participant
   */
  async updateProfile(data: Partial<ParticipantProfileBase>) {
    return updateDoc(
      doc(firestore, 'experiments', this.experimentId, 'participants', this.participantId),
      data,
    );
  }

  /** Update this participant's `workingOnStageName`
   * @rights Participant
   */
  async workOnStage(stageName: string) {
    return updateDoc(
      doc(firestore, 'experiments', this.experimentId, 'participants', this.participantId),
      {
        workingOnStageName: stageName,
      },
    );
  }

  /** Update this participant's `workingOnStageName`
   * @rights Participant
   */
  async updateSurveyStage(stageName: string, answers: QuestionAnswer[]) {
    return updateStageCallable({
      experimentId: this.experimentId,
      participantId: this.participantId,
      stageName,
      stage: {
        kind: StageKind.TakeSurvey,
        answers: lookupTable(answers, 'id'),
      },
    });
  }

  /** Update this participant's `workingOnStageName`
   * @rights Participant
   */
  async updateVoteForLeaderStage(stageName: string, votes: Votes) {
    return updateStageCallable({
      experimentId: this.experimentId,
      participantId: this.participantId,
      stageName,
      stage: {
        kind: StageKind.VoteForLeader,
        votes,
      },
    });
  }
}
