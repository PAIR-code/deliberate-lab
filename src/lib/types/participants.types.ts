/**
 * Types for the participants
 */

import { ExpStage } from './stages.types';

export interface ParticipantId {
  uid: string; // Unique identifier for the participant.
  experimentId: string; // Participants are strongly tied to an experiment.
}

export interface ParticipantProfile extends ParticipantId {
  pronouns: string;
  avatarUrl: string;
  name: string;
  acceptTosTimestamp: string;
}

// The stage data for a participant does not have its ids
export type TosAndUserProfile = Exclude<ParticipantProfile, ParticipantId>;

export interface ParticipantExtended extends ParticipantProfile {
  stageMap: Record<string, ExpStage>;
  allowedStageProgressionMap: Record<string, boolean>;
  futureStageNames: string[];
  completedStageNames: string[];
  workingOnStageName: string;
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
