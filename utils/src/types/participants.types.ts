/**
 * Types for the participants
 */

import { UnifiedTimestamp } from './api.types';

export interface ParticipantProfile {
  publicId: string; // Public identifier for the participant inside an experiment

  pronouns: string | null;
  avatarUrl: string | null;
  name: string | null;

  acceptTosTimestamp: UnifiedTimestamp | null;
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
  workingOnStageName,
});

export const participantPublicId = (index: number) => `participant-${index}`;
