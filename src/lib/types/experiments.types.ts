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
