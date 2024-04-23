/** API experiment types. For the actual stage types, see stages.types.ts */

import { ParticipantExtended } from './participants.types';
import { ExpStage } from './stages.types';

/** Experiment metadata */
export interface Experiment {
  uid: string; // id in the "experiments" collection
  name: string;
  date: Date;
  numberOfParticipants: number;
}

/** Experiment extended with the participants' data */
export interface ExperimentExtended extends Experiment {
  participants: ParticipantExtended[];
}

/** Data to be sent to the backend in order to generate an experiment and its participants */
export interface ExperimentCreationData {
  name: string;
  stageMap: Record<string, ExpStage>;
  numberOfParticipants: number;
  allowedStageProgressionMap: Record<string, boolean>;
}

/** An experiment template */
export interface Template {
  uid: string;
  name: string;
  stageMap: Record<string, ExpStage>;
  allowedStageProgressionMap: Record<string, boolean>;
}
