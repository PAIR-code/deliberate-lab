/**
 * Types for the participants
 */

import { UnifiedTimestamp } from './api.types';

/** Profile data that is modifiable by the participant */
export interface ParticipantProfileBase {
  pronouns: string | null;
  avatarUrl: string | null;
  name: string | null;

  acceptTosTimestamp: UnifiedTimestamp | null;
  completedExperiment: UnifiedTimestamp | null;

  prolificId: string | null;
}

/** Full participant profile document data */
export interface ParticipantProfile extends ParticipantProfileBase {
  publicId: string; // Public identifier for the participant inside an experiment
  currentStageId: string;
  transferConfig: ExperimentTransferConfig | null;
}

/** For experimenters to be aware of the private ID */
export interface ParticipantProfileExtended extends ParticipantProfile {
  privateId: string;
}

/** Experiment transfer config. */
export interface ExperimentTransferConfig {
  experimentId: string;
  participantId: string;
}

export const participantPublicId = (index: number) => `participant-${index}`;
