import { Signal, WritableSignal, signal } from '@angular/core';
import { CacheMap, Experiment, ParticipantProfileExtended } from '@llm-mediation-experiments/utils';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { collectSnapshotWithId } from '../utils/firestore.utils';
import { BaseRepository } from './base.repository';

/** Handle experimenter-related data:
 * - List experiments
 * - List experiment users
 * - Create experiments and templates
 */
export class ExperimenterRepository extends BaseRepository {
  // Internal writable signals
  private _experiments: WritableSignal<Experiment[]> = signal([]);
  public readonly experimentParticipants = new CacheMap(this.createParticipantsSignal);

  // Expose the signals as read-only
  public get experiments(): Signal<Experiment[]> {
    return this._experiments;
  }

  constructor() {
    super();
    // Subscribe to all experiment documents
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'experiments'), (snapshot) => {
        this._experiments.set(collectSnapshotWithId<Experiment>(snapshot, 'id'));
      }),
    );
  }

  /** Create a signal that holds the value of all participant profiles for a given experiment. */
  private createParticipantsSignal(experimentId: string): Signal<ParticipantProfileExtended[]> {
    const _signal = signal<ParticipantProfileExtended[]>([]);

    // Bind the signal to the firestore collection
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'experiments', experimentId, 'participants'), (snapshot) => {
        _signal.set(collectSnapshotWithId<ParticipantProfileExtended>(snapshot, 'privateId'));
      }),
    );

    return _signal;
  }
}
