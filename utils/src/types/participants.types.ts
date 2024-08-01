/**
 * Types for the participants
 */

import { UnifiedTimestamp } from './api.types';

export enum PARTICIPANT_COMPLETION_TYPE {
  SUCCESS = 'SUCCESS',
  // Failed to transfer to a lobby within the designated time.
  LOBBY_TIMEOUT = 'LOBBY_FAIL',
  // Failed to clear the attention check within the designated time.
  ATTENTION_TIMEOUT = 'ATTENTION_FAIL',
}

/** Profile data that is modifiable by the participant */
export interface ParticipantProfileBase {
  pronouns: string | null;
  avatarUrl: string | null;
  name: string | null;

  acceptTosTimestamp: UnifiedTimestamp | null;
  completedExperiment: UnifiedTimestamp | null;
  completionType: PARTICIPANT_COMPLETION_TYPE | null;
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
