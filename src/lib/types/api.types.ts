/** Types wrappers for the API */

import { CreateMutationResult, CreateQueryResult } from '@tanstack/angular-query-experimental';
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
