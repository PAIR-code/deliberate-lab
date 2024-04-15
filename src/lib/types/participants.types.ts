/**
 * Types for the participants
 */

import { ExcludeProps } from '../utils/object.utils';
import { ExpStage } from './stages.types';

export interface ParticipantId {
  uid: string; // Unique identifier for the participant.
  experimentId: string; // Participants are strongly tied to an experiment.
}

export interface ParticipantProfile extends ParticipantId {
  pronouns: string;
  avatarUrl: string;
  name: string;
  acceptTosTimestamp: string | null;
}

// The stage data for a participant does not have its ids
export type TosAndUserProfile = ExcludeProps<ParticipantProfile, ParticipantId> & {
  tosLines: string[];
};

export interface ParticipantExtended extends ParticipantProfile {
  stageMap: Record<string, ExpStage>;
  allowedStageProgressionMap: Record<string, boolean>;
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

export const getDefaultProfile = (): ParticipantProfile => ({
  uid: 'fakeId',
  experimentId: 'fakeExpId',
  pronouns: 'they/them',
  avatarUrl: '',
  name: 'fakeName',
  acceptTosTimestamp: 'fakeTimestamp',
});
