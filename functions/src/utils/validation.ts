/** Pretty printing and analysis utils for typebox validation */

import {
  CONFIG_DATA,
  Index,
  StageConfigData,
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from '@deliberation-lab/utils';
import {TSchema} from '@sinclair/typebox';
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
  // If path is empty, return the object itself
  if (path === '') return obj;
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
  unionValidators: Record<Index, TSchema>,
  references?: TSchema[],
): ValueErrorIterator => {
  // Access the nested value that failed validation
  const value = accessNestedValue(data, path);

  // Check if value exists and has a kind property
  if (!value || typeof value !== 'object') {
    throw new Error(
      `Union error path "${path}" does not point to a valid object`,
    );
  }

  if (!('kind' in value)) {
    throw new Error(
      'Union error path must point to a value with a "kind" property',
    );
  }

  const validator = unionValidators[value.kind as Index];

  // Validate the value with the correct validator, passing references for $ref resolution
  return references
    ? Value.Errors(validator, references, value)
    : Value.Errors(validator, value);
};

// Variants
export const checkConfigDataUnionOnPath = (
  data: unknown,
  path: string,
  references?: TSchema[],
) => checkUnionErrorOnPath(data, path, CONFIG_DATA, references);

// ************************************************************************* //
// STAGE VALIDATION                                                          //
// ************************************************************************* //

/**
 * Validate an array of stage configurations using TypeBox runtime validation
 * Uses existing validation utilities to handle union errors properly
 * @param stages - Array of stage objects to validate
 * @returns Error message string if invalid, null if all stages are valid
 */
export function validateStages(stages: unknown[]): string | null {
  if (!Array.isArray(stages)) {
    return 'Invalid stages: must be an array';
  }

  const errorMessages: string[] = [];

  // Pass schema references array for $ref resolution
  const references: TSchema[] = [
    StageTextConfigSchema,
    StageProgressConfigSchema,
  ];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    let isValid = false;
    try {
      isValid = Value.Check(StageConfigData, references, stage);
    } catch (error: unknown) {
      // If validation throws an error, treat as invalid
      console.error('TypeBox validation error:', error);
      continue;
    }

    if (!isValid) {
      // Extract stage metadata for context
      const stageObj = stage as Record<string, unknown>;
      const stageName = stageObj?.name || 'unnamed';
      const stageKind = stageObj?.kind || 'unknown';

      errorMessages.push(
        `Stage ${i} (name: "${stageName}", kind: "${stageKind}"):`,
      );

      // Iterate through errors and handle union errors specially
      for (const error of Value.Errors(StageConfigData, references, stage)) {
        if (isUnionError(error)) {
          // For union errors (like StageConfig which is a union of many stage types),
          // drill down to get the specific validation error for this stage kind
          try {
            const nested = checkConfigDataUnionOnPath(
              stage,
              error.path,
              references,
            );
            for (const nestedError of nested) {
              errorMessages.push(
                `  - ${nestedError.path}: ${nestedError.message}`,
              );
            }
          } catch (err) {
            // If drilling into union fails, fall back to generic error
            errorMessages.push(`  - ${error.path}: ${error.message}`);
          }
        } else {
          errorMessages.push(`  - ${error.path}: ${error.message}`);
        }
      }
    }
  }

  return errorMessages.length > 0 ? errorMessages.join('\n') : null;
}
