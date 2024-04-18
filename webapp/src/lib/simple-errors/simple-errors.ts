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

export interface SimpleError {
  error: string;
}

export function isErrorResponse<T, E extends AbstractSimpleResponse>(response: T | E): response is E {
  if ((response as E).error) {
    return true;
  }
  return false;
}

export function assertNoErrorResponse<T, E extends AbstractSimpleResponse>(response: T | E): asserts response is T {
  if ((response as E).error) {
    throw new Error('response was an error after all');
  }
}
