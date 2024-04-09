/** Types wrappers for the API */

import { CreateMutationResult, CreateQueryResult } from '@tanstack/angular-query-experimental';

/** Simple response with data */
export interface SimpleResponse<T> {
  data: T;
}

export interface CreationResponse {
  uid: string;
}

export type QueryType<T> = CreateQueryResult<T, Error>;

export type MutationType<T> = CreateMutationResult<unknown, Error, T, unknown>;

/** Type for a onSuccess function callback */
export type OnSuccess<T> = (data: T) => Promise<void> | void;
