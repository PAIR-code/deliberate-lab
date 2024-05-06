import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { Experiment, StageConfig } from '@llm-mediation-experiments/utils';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { BaseRepository } from './base.repository';

export class ExperimentRepository extends BaseRepository {
  // Internal writable signals
  private _experiment: WritableSignal<Experiment | undefined> = signal(undefined);
  private _publicStageDataMap: Record<string, WritableSignal<unknown>> = {}; // TODO: type ?
  private _stageConfigMap: WritableSignal<Record<string, StageConfig> | undefined> =
    signal(undefined);

  // Expose the signals as read-only
  public get experiment(): Signal<Experiment | undefined> {
    return this._experiment;
  }

  public get stageConfigMap(): Signal<Record<string, StageConfig> | undefined> {
    return this._stageConfigMap;
  }

  public get publicStageDataMap(): Record<string, Signal<unknown>> {
    return this._publicStageDataMap;
  }

  public stageNames = computed(() => Object.keys(this._stageConfigMap() || {}));

  /** @param uid Experiment unique identifier (firestore document id) */
  constructor(public readonly uid: string) {
    super();

    // Subscribe to the experiment
    this.unsubscribe.push(
      onSnapshot(doc(firestore, 'experiments', uid), (doc) => {
        this._experiment.set(doc.data() as Experiment);
      }),
    );

    // Subscribe to the public stage data
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'experiments', uid, 'publicStageData'), (snapshot) => {
        let changedDocs = snapshot.docChanges().map((change) => change.doc);
        if (changedDocs.length === 0) changedDocs = snapshot.docs;

        // Update the public stage data signals
        changedDocs.forEach((doc) => {
          this._publicStageDataMap[doc.id].set(doc.data() as unknown);
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
}
