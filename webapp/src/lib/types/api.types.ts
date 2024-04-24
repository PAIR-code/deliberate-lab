/** Types wrappers for the API */

import { CreateMutationResult, CreateQueryResult } from '@tanstack/angular-query-experimental';
import { QuestionUpdate } from './questions.types';
import { ExpStage } from './stages.types';

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  uid: string;
}

export type QueryType<T> = CreateQueryResult<T, Error>;

export type MutationType<Input, Output = Input> = CreateMutationResult<
  Output,
  Error,
  Input,
  unknown
>;

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
  stageMap: Record<string, ExpStage>;
  allowedStageProgressionMap: Record<string, boolean>;
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
  questions: QuestionUpdate[];
}>;

export type ChatStageUpdate = GenericStageUpdate<{
  readyToEndChat: boolean;
}>;
