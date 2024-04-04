/**
 * Types for the participants
 */

import { ExpStage } from '../staged-exp/data-model';

export interface ParticipantProfile {
  uid: string; // Unique identifier for the participant.
  experimentId: string; // Participants are strongly tied to an experiment.

  pronouns: string;
  avatarUrl: string;
  name: string;
}

export interface ParticipantExtended extends ParticipantProfile {
  stageMap: Record<string, ExpStage>; // TODO: refactor ExpStage
  allowedStageProgressionMap: Record<string, boolean>;
  futureStageNames: string[];
  completedStageNames: string[];
  workingOnStageName: string;
}
