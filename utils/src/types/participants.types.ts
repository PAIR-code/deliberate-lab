/**
 * Types for the participants
 */

import { ExcludeProps } from '../utils/object.utils';
import { UnifiedTimestamp } from './api.types';
import { ExpStage } from './stages.types';

export interface ParticipantId {
  uid: string; // Unique identifier for the participant.
  experimentId: string; // Participants are strongly tied to an experiment ? est-ce qu'on a besoin de savoir ça ? nan, pour y accéder ça sera stocké quelque part
}

export interface ParticipantProfile {
  publicId: string; // Public identifier for the participant inside an experiment

  pronouns: string | null;
  avatarUrl: string | null;
  name: string | null;

  acceptTosTimestamp: UnifiedTimestamp | null;
  workingOnStageName: string;
}

// The stage data for a participant does not have its ids
export type TosAndUserProfile = ExcludeProps<ParticipantProfile, ParticipantId> & {
  tosLines: string[];
};

export interface ParticipantExtended extends ParticipantProfile {
  stageMap: Record<string, ExpStage>;
  futureStageNames: string[];
  completedStageNames: string[];
  workingOnStageName: string;
}

/** Isolated document data to synchronize participants progression for an experiment using firestore subscriptions */
export interface ParticipantsProgression {
  experimentId: string;
  progressions: Record<string, string>;
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
