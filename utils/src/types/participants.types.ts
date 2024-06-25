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
}

/** Full participant profile document data */
export interface ParticipantProfile extends ParticipantProfileBase {
  publicId: string; // Public identifier for the participant inside an experiment
  workingOnStageName: string;
}

/** For experimenters to be aware of the private ID */
export interface ParticipantProfileExtended extends ParticipantProfile {
  privateId: string;
}

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultProfile = (
  publicId: string,
  workingOnStageName: string,
): ParticipantProfile => ({
  publicId,
  pronouns: null,
  avatarUrl: null,
  name: null,
  acceptTosTimestamp: null,
  completedExperiment: null,
  workingOnStageName,
});

export const participantPublicId = (index: number) => `participant-${index}`;
