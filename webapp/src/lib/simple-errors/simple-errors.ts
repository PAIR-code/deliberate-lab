/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

export interface AbstractSimpleResponse {
  error: unknown;
}

export interface SimpleError extends AbstractSimpleResponse {
  error: string;
}

export function isErrorResponse<T, E extends AbstractSimpleResponse>(
  response: T | E,
): response is E {
  if ((response as E).error) {
    return true;
  }
  return false;
}

export function assertNoErrorResponse<E extends AbstractSimpleResponse, T extends object>(
  response: E | T,
): asserts response is Exclude<T, E> {
  if ('error' in response && (response as E).error) {
    throw new Error('response was an error after all');
  }
}
