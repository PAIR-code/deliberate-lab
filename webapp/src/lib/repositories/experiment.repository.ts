import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { Experiment, PublicStageData, StageConfig } from '@llm-mediation-experiments/utils';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { BaseRepository } from './base.repository';

export class ExperimentRepository extends BaseRepository {
  // Internal writable signals
  private _experiment: WritableSignal<Experiment | undefined> = signal(undefined);
  private _publicStageDataMap: Record<string, WritableSignal<PublicStageData> | undefined> = {};
  private _stageConfigMap: Record<string, WritableSignal<StageConfig>> = {};
  private _stageNames: WritableSignal<string[]> = signal([]); // Helper signal computed along the stage configs

  // Expose the signals as read-only
  public get experiment(): Signal<Experiment | undefined> {
    return this._experiment;
  }

  public get stageConfigMap(): Record<string, Signal<StageConfig>> {
    return this._stageConfigMap;
  }

  // Some stages do not have public data, not all signals are guaranteed to be defined for all stages
  public get publicStageDataMap(): Record<string, Signal<PublicStageData> | undefined> {
    return this._publicStageDataMap;
  }

  public get stageNames(): Signal<string[]> {
    return this._stageNames;
  }

  // Computed helper signals
  // Loading state: enables knowing when the records are populated and ready to use
  private loadingState = {
    experiment: signal(true),
    publicStageData: signal(true),
    config: signal(true),
  };
  public isLoading = computed(() => Object.values(this.loadingState).some((signal) => signal()));

  /** @param uid Experiment unique identifier (firestore document id) */
  constructor(public readonly uid: string) {
    super();

    // Subscribe to the experiment
    this.unsubscribe.push(
      onSnapshot(doc(firestore, 'experiments', uid), (doc) => {
        this._experiment.set({ id: doc.id, ...doc.data() } as Experiment);
        this.loadingState.experiment.set(false);
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
          else this._publicStageDataMap[doc.id]!.set(data);
        });
        this.loadingState.publicStageData.set(false);
      }),
    );

    // Subscribe to the config data (although it will not change upon first fetch. We do this to normalize the API)
    // Fetch the experiment config (it will not change, no subscription is needed)
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'experiments', uid, 'stages'), (snapshot) => {
        let changedDocs = snapshot.docChanges().map((change) => change.doc);
        if (changedDocs.length === 0) changedDocs = snapshot.docs;

        // Update the stage config signals
        changedDocs.forEach((doc) => {
          const data = doc.data() as StageConfig;
          if (!this._stageConfigMap[doc.id]) this._stageConfigMap[doc.id] = signal(data);
          else this._stageConfigMap[doc.id].set(data);
        });

        // Load the stage names
        this._stageNames.set(Object.keys(this._stageConfigMap));

        this.loadingState.config.set(false);
      }),
    );
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

  // ******************************************************************************************* //
  //                                           MUTATIONS                                         //
  // ******************************************************************************************* //

  /** Delete the experiment..
   * @rights Experimenter
   */
  async delete() {
    return deleteDoc(doc(firestore, 'experiments', this.uid));
  }
}
