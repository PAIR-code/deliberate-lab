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

export type MutationType<Input, Output = Input> = CreateMutationResult<
  Output,
  Error,
  Input,
  unknown
>;

/** Type for a onSuccess function callback */
export type OnSuccess<T> = (data: T) => Promise<void> | void;
