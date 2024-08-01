/** API experiment types. For the actual stage types, see stages.types.ts */

import { UnifiedTimestamp } from './api.types';
import { ParticipantProfile } from './participants.types';
import { StageConfig } from './stages.types';

/** Experimenter profile */
export interface Experimenter {
  uid: string;
  displayName: string;
}

export interface ParticipantConfig {
  numberOfMaxParticipants?: number;
  waitForAllToStart: boolean;
}

export interface AttentionCheckConfig {
  waitSeconds?: number;
  popupSeconds?: number;
  prolificAttentionFailRedirectCode?: string;
}

/** Experiment metadata */
export interface Experiment {
  id: string;
  group?: string;
  name: string; // private name viewable to experimenters
  publicName: string; // experiment name shown to participants
  description: string;
  tags: string[];
  author: Experimenter;
  starred: Record<string, boolean>; // maps from experimenter ID to isStarred
  isLobby: boolean; // true if lobby experiment
  date: UnifiedTimestamp;
  numberOfParticipants: number;
  participantConfig: ParticipantConfig;
  prolificRedirectCode?: string; // If specified, will handle Prolific routing.
  attentionCheckConfig?: AttentionCheckConfig;
  // Ordered list of stage IDs
  stageIds: string[];

  // Readonly participant public id => participant profile map
  participants: Record<string, ParticipantProfile>;
}

/** An experiment template */
export interface ExperimentTemplate {
  id: string;
  name: string; // private name viewable to experimenters
  publicName: string; // experiment name shown to participants
  description: string;
  tags: string[];
  author: Experimenter;
}

/** An experiment template with all its stages preloaded */
export interface ExperimentTemplateExtended extends ExperimentTemplate {
  stageMap: Record<string, StageConfig>;
}
