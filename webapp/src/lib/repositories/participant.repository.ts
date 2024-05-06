import { Signal, WritableSignal, signal } from '@angular/core';
import { ParticipantProfile, StageAnswer } from '@llm-mediation-experiments/utils';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { BaseRepository } from './base.repository';

export class ParticipantRepository extends BaseRepository {
  // Internal writable signals
  private _profile: WritableSignal<ParticipantProfile | undefined> = signal(undefined);
  private _stageAnswers: Record<string, WritableSignal<StageAnswer>> = {};

  // Expose the signals as read-only
  public get profile(): Signal<ParticipantProfile | undefined> {
    return this._profile;
  }

  public get stageAnswers(): Record<string, Signal<StageAnswer>> {
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
            this._stageAnswers[doc.id].set(doc.data() as StageAnswer);
          });
        },
      ),
    );
  }
}
