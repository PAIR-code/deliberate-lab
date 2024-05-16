/** API experiment types. For the actual stage types, see stages.types.ts */

import { UnifiedTimestamp } from './api.types';
import { ParticipantProfile } from './participants.types';
import { StageConfig } from './stages.types';

/** Experiment metadata */
export interface Experiment {
  id: string;

  name: string;
  date: UnifiedTimestamp;
  numberOfParticipants: number;

  // Readonly participant public id => participant profile map
  participants: Record<string, ParticipantProfile>;
}

/** An experiment template */
export interface ExperimentTemplate {
  id: string;
  name: string;
}

/** An experiment template with all its stages preloaded */
export interface ExperimentTemplateExtended extends ExperimentTemplate {
  stageMap: Record<string, StageConfig>;
}
