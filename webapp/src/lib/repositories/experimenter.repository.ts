import { Signal, WritableSignal, signal } from '@angular/core';
import {
  CacheMap,
  Experiment,
  ExperimentTemplate,
  ExperimentTemplateExtended,
  ParticipantProfileExtended,
  lookupTable,
} from '@llm-mediation-experiments/utils';
import { collection, doc, getDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { firestore } from '../api/firebase';
import { collectSnapshotWithId } from '../utils/firestore.utils';
import { BaseRepository } from './base.repository';

/** Handle experimenter-related data:
 * - List experiments
 * - List templates
 * - List experiment users
 * - Create experiments and templates
 */
export class ExperimenterRepository extends BaseRepository {
  // Internal writable signals
  private _experiments: WritableSignal<Experiment[]> = signal([]);
  private _templates: WritableSignal<ExperimentTemplate[]> = signal([]);

  public readonly templatesWithConfigs = new CacheMap(loadExperimentTemplate);
  public readonly experimentParticipants = new CacheMap((expId: string) =>
    this.createParticipantsSignal(expId),
  );

  // Expose the signals as read-only
  public get experiments(): Signal<Experiment[]> {
    return this._experiments;
  }
  public get templates(): Signal<ExperimentTemplate[]> {
    return this._templates;
  }

  constructor() {
    super();
    // Subscribe to all experiment documents
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'experiments'), (snapshot) => {
        this._experiments.set(collectSnapshotWithId<Experiment>(snapshot, 'id'));
      }),
    );

    // Subscribe to all experiment template documents
    this.unsubscribe.push(
      onSnapshot(collection(firestore, 'templates'), (snapshot) => {
        this._templates.set(collectSnapshotWithId<ExperimentTemplate>(snapshot, 'id'));
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

/** Load a template with all its stage config data.
 * We create a signal to handle async loading, but it will not be updated further as templates are not dynamically changed.
 */
const loadExperimentTemplate = (
  templateId: string,
): Signal<ExperimentTemplateExtended | undefined> => {
  const template = signal<ExperimentTemplateExtended | undefined>(undefined);

  const templateDoc = getDoc(doc(firestore, 'templates', templateId)); // The template metadata
  const stagesDocs = getDocs(collection(firestore, 'templates', templateId, 'stages')); // The actual config for every stage

  Promise.all([templateDoc, stagesDocs]).then(([templateDoc, stagesDocs]) => {
    template.set({
      id: templateId,
      name: templateDoc.data()!['name'],
      stageMap: lookupTable(collectSnapshotWithId(stagesDocs, 'name'), 'name'),
    });
  });

  return template;
};
