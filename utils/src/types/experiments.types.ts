/** API experiment types. For the actual stage types, see stages.types.ts */

import { UnifiedTimestamp } from './api.types';
import { ParticipantProfile } from './participants.types';
import { StageConfig } from './stages.types';

/** Experiment metadata */
export interface Experiment {
  name: string;
  date: UnifiedTimestamp;
  numberOfParticipants: number;

  // Readonly participant public id => participant profile map
  participants: Record<string, ParticipantProfile>;
}

/** Data to be sent to the backend in order to generate an experiment and its participants */
export interface ExperimentCreationData {
  name: string;
  stageMap: Record<string, StageConfig>;
  numberOfParticipants: number;
}

/** An experiment template */
export interface Template {
  name: string;
}
