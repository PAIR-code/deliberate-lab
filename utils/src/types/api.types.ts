/** Types wrappers for the API */

import type { Timestamp } from 'firebase/firestore';
import { QuestionAnswer } from './questions.types';
import { StageConfig } from './stages.types';
import { Votes } from './votes.types';

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  uid: string;
}

/** Type for a onSuccess function callback */
export type OnSuccess<T> = (data: T) => Promise<void> | void;

export type OnError = ((error: Error, variables: string, context: unknown) => unknown) | undefined;

/** Send additional stage progression information for participants. */
export interface Progression {
  justFinishedStageName?: string;
}

/** Data to be sent to the backend in order to generate a template */
export interface TemplateCreationData {
  name: string;
  stageMap: Record<string, StageConfig>;
}

export interface ProfileTOSData extends Progression {
  uid: string;
  name: string;
  pronouns: string;
  avatarUrl: string;
  acceptTosTimestamp: string;
}

export interface ChatToggleUpdate {
  readyToEndChat: boolean;
  participantId: string;
  chatId: string;
}

// ********************************************************************************************* //
//                                        STAGE UPDATES                                          //
// ********************************************************************************************* //

/** Generic stage update data */
export interface GenericStageUpdate<T> extends Progression {
  uid: string; // Participant UID
  name: string; // Stage name (unique identifier)
  data: T;
}

export type SurveyStageUpdate = GenericStageUpdate<{
  questions: QuestionAnswer[];
}>;

export type ChatStageUpdate = GenericStageUpdate<{
  readyToEndChat: boolean;
}>;

export type LeaderVoteStageUpdate = GenericStageUpdate<Votes>;

export type LeaderRevealStageUpdate = GenericStageUpdate<undefined>;

// Helper for Timestamp (make it work between admin & sdk)
// Packages firebase-admin/firestore and firebase/firestore use different Timestamp types
// This type is a workaround to handle both types in the same codebase
// When creating a new Timestamp, use the Timestamp class from the correct package, its type is compatible with this type
export type UnifiedTimestamp = Omit<Timestamp, 'toJSON'>;
