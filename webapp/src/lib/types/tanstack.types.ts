/** Types helpers for tanstack query */

import { CreateMutationResult, CreateQueryResult } from '@tanstack/angular-query-experimental';

export type QueryType<T> = CreateQueryResult<T, Error>;

export type MutationType<Input, Output = Input> = CreateMutationResult<
  Output,
  Error,
  Input,
  unknown
>;
