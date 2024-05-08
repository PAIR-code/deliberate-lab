import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { Experiment, PublicStageData, StageConfig } from '@llm-mediation-experiments/utils';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { BaseRepository } from './base.repository';

export class ExperimentRepository extends BaseRepository {
  // Internal writable signals
  private _experiment: WritableSignal<Experiment | undefined> = signal(undefined);
  private _publicStageDataMap: Record<string, WritableSignal<PublicStageData>> = {};
  private _stageConfigMap: WritableSignal<Record<string, StageConfig> | undefined> =
    signal(undefined);

  // Expose the signals as read-only
  public get experiment(): Signal<Experiment | undefined> {
    return this._experiment;
  }

  public get stageConfigMap(): Signal<Record<string, StageConfig> | undefined> {
    return this._stageConfigMap;
  }

  public get publicStageDataMap(): Record<string, Signal<PublicStageData>> {
    return this._publicStageDataMap;
  }

  // Computed helper signals
  public stageNames = computed(() => Object.keys(this._stageConfigMap() || {}));

  /** @param uid Experiment unique identifier (firestore document id) */
  constructor(public readonly uid: string) {
    super();

    // Subscribe to the experiment
    this.unsubscribe.push(
      onSnapshot(doc(firestore, 'experiments', uid), (doc) => {
        this._experiment.set({ id: doc.id, ...doc.data() } as Experiment);
      }),
    );

    // Subscribe to the public stage data
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'experiments', uid, 'publicStageData'), (snapshot) => {
        let changedDocs = snapshot.docChanges().map((change) => change.doc);
        if (changedDocs.length === 0) changedDocs = snapshot.docs;

        // Update the public stage data signals
        changedDocs.forEach((doc) => {
          const data = doc.data() as PublicStageData;
          if (!this._publicStageDataMap[doc.id]) this._publicStageDataMap[doc.id] = signal(data);
          else this._publicStageDataMap[doc.id].set(data);
        });
      }),
    );

    // Fetch the experiment config (it will not change, no subscription is needed)
    getDocs(collection(firestore, 'experiments', uid, 'stageConfig')).then((snapshot) => {
      const map: Record<string, StageConfig> = {};

      snapshot.docs.forEach((doc) => {
        map[doc.id] = doc.data() as StageConfig;
      });

      this._stageConfigMap.set(map);
    });
  }

  /** Build a signal that tracks whether every participant has at least reached the given stage */
  everyoneReachedStage(targetStage: string): Signal<boolean> {
    return computed(() => {
      const participants = this.experiment()?.participants;
      const stages = this.stageNames();
      const targetIndex = stages.indexOf(targetStage);

      if (!participants || targetIndex === -1) return false;

      return Object.values(participants).every(
        (participant) => stages.indexOf(participant.workingOnStageName) >= targetIndex,
      );
    });
  }
}
