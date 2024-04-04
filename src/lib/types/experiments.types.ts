import { ExpStage } from '../staged-exp/data-model';
import { ParticipantExtended } from './participants.types';

/** Experiment metadata */
export interface Experiment {
  uid: string; // id in the "experiments" collection
  name: string;
  date: Date;
  numberOfParticipants: number;
}

/** Experiment extended with the participants' data */
export interface ExperimentExtended extends Experiment {
  participants: Record<string, ParticipantExtended>;
}

/** Data to be sent to the backend in order to generate an experiment and its participants */
export interface ExperimentCreationData {
  name: string;
  stageMap: Record<string, ExpStage>;
  numberOfParticipants: number;
  allowedStageProgressionMap: Record<string, boolean>;
}

/** Data to be sent to the backend in order to generate a template */
export interface TemplateCreationData {
  name: string;
  stageMap: Record<string, ExpStage>;
  allowedStageProgressionMap: Record<string, boolean>;
}
