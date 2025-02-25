/** Pretty printing and analysis utils for typebox validation */

import {CONFIG_DATA, Index} from '@deliberation-lab/utils';
import {TObject} from '@sinclair/typebox';
import {
  ValueError,
  ValueErrorIterator,
} from '@sinclair/typebox/build/cjs/errors';
import {Value} from '@sinclair/typebox/value';

// ************************************************************************* //
// PRETTY PRINTING                                                           //
// ************************************************************************* //

/** Pretty print typebox validation error */
export const prettyPrintError = (error: ValueError) => {
  console.error(
    `${error.message} for key "${error.path.slice(1).replace(/\//g, '.')}" (received value ${error.value})`,
  );
};

/** Pretty print typebox validation errors */
export const prettyPrintErrors = (
  errors: ValueErrorIterator | ValueError[],
) => {
  for (const error of errors) {
    prettyPrintError(error);
  }
};

// ************************************************************************* //
// DATA ACCESS                                                               //
// ************************************************************************* //

/** Access nested values in an object using typebox error paths */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const accessNestedValue = (obj: any, path: string, sep = '/') => {
  if (path.startsWith(sep)) path = path.slice(sep.length);
  return path.split(sep).reduce((acc, key) => {
    return acc[key];
  }, obj);
};

// ************************************************************************* //
// VALIDATION                                                                //
// ************************************************************************* //

/** Check if a typebox validation error is a union error */
export const isUnionError = (error: ValueError) => error.type === 62;

/** Given existing data and a typebox error path, perform a deep check for
 * union errors on this path */
export const checkUnionErrorOnPath = (
  data: unknown,
  path: string,
  unionValidators: Record<Index, TObject>,
): ValueErrorIterator => {
  // Access the nested value that failed validation
  const value = accessNestedValue(data, path);

  // Get the union validator related to the data kind
  if (!('kind' in value)) {
    throw new Error(
      'Union error path must point to a value with a "kind" property',
    );
  }

  const validator = unionValidators[value.kind];

  // Validate the value with the correct validator
  return Value.Errors(validator, value);
};

// Variants
export const checkConfigDataUnionOnPath = (data: unknown, path: string) =>
  checkUnionErrorOnPath(data, path, CONFIG_DATA);

// TODO: add more union validation variants if needed when something goes wrong
