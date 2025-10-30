import Mustache from 'mustache';
import {
  ExperimentVariables,
  VariableDefinition,
  VariableCohort,
  VariableType,
  VariableValue,
} from './variables';

/**
 * Template resolution utilities for experiment variables
 *
 * IMPLEMENTATION:
 * - Uses Mustache for template rendering (lightweight, ~15KB)
 * - Supports {{variableName}} and {{object.property}} syntax
 * - HTML escaping is automatic by default (use {{{variableName}}} for unescaped)
 * - Logic-less templates keep complexity low
 *
 * MUSTACHE SYNTAX:
 * - {{name}} - Variable substitution (HTML escaped)
 * - {{{name}}} - Unescaped variable substitution
 * - {{#section}}...{{/section}} - Conditional sections (if truthy)
 * - {{^section}}...{{/section}} - Inverted sections (if falsy)
 * - {{! comment }} - Comments
 */

// ************************************************************************* //
// Template Resolution
// ************************************************************************* //

/**
 * Extract all variable references from a Mustache template
 * Uses Mustache's own parser to get accurate variable names
 */
export function extractVariableReferences(template: string): string[] {
  try {
    const tokens = Mustache.parse(template);
    const references = new Set<string>();

    // Recursively extract variable names from parsed tokens
    function extractFromTokens(tokens: unknown[]): void {
      for (const token of tokens) {
        // Mustache tokens are tuples with varying lengths depending on token type
        // We only care about extracting the type and name fields
        if (!Array.isArray(token)) continue;
        const [type, name, , , subTokens] = token as [
          string,
          string,
          number,
          number,
          unknown[]?,
        ];

        // Token types: 'name' for variables, '#' for sections, '^' for inverted sections
        if (
          (type === 'name' || type === '#' || type === '^' || type === '&') &&
          name
        ) {
          references.add(name);
        }

        // Recursively process sub-tokens in sections
        if (subTokens && Array.isArray(subTokens)) {
          extractFromTokens(subTokens);
        }
      }
    }

    extractFromTokens(tokens);
    return Array.from(references);
  } catch (error) {
    // If parsing fails, return empty array
    console.warn('Failed to parse template for variable extraction:', error);
    return [];
  }
}

/**
 * Resolve a template string with variable values using Mustache
 *
 * @param template - The template string with {{variables}}
 * @param variables - Variable values to substitute
 * @param defaultValues - Default values for missing variables
 * @param _options - Options (kept for API compatibility, escaping is handled by Mustache)
 */
export function resolveTemplate(
  template: string,
  variables: Record<string, VariableValue>,
  defaultValues?: Record<string, VariableValue>,
  _options: {escapeHtml?: boolean} = {},
): string {
  // Merge variables with defaults
  const context = {
    ...defaultValues,
    ...variables,
  };

  // Configure Mustache to not escape HTML if specified
  // By default, Mustache escapes HTML automatically with {{variable}}
  // Use {{{variable}}} in templates for unescaped values

  try {
    // Parse the template first to catch syntax errors
    Mustache.parse(template);

    // Render the template with the context
    return Mustache.render(template, context);
  } catch (error) {
    // If there's an error parsing/rendering, return the original template
    // This maintains backward compatibility with templates that might not be valid Mustache
    console.warn('Failed to render Mustache template:', error);
    return template;
  }
}

// ************************************************************************* //
// Variable Resolution for Participants
// ************************************************************************* //

/**
 * Resolve variables for a participant based on their cohort
 * Returns merged cohort variables with defaults
 */
export function resolveParticipantVariables(
  experimentVariables: ExperimentVariables,
  cohortName: string,
): Record<string, VariableValue> {
  const cohort = experimentVariables.cohorts[cohortName];
  const defaults = getDefaultValues(experimentVariables.definitions);

  // Merge defaults with cohort variables (cohort overrides defaults)
  return cohort ? {...defaults, ...cohort.variables} : defaults;
}

/**
 * Get default values for all defined variables
 * Used as fallback when variables are not specified
 */
function getDefaultValues(
  definitions: Record<string, VariableDefinition>,
): Record<string, VariableValue> {
  const defaults: Record<string, VariableValue> = {};

  for (const [name, definition] of Object.entries(definitions)) {
    defaults[name] = definition.defaultValue ?? getTypeDefault(definition.type);
  }

  return defaults;
}

/** Get sensible default value for a type */
function getTypeDefault(type: VariableType): VariableValue {
  switch (type) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'object':
      return {};
  }
}

// ************************************************************************* //
// Validation
// ************************************************************************* //

/**
 * Validate that a template's variable references are defined
 * Also validates that the template is valid Mustache syntax
 */
export function validateTemplateVariables(
  template: string,
  definitions: Record<string, VariableDefinition>,
): {valid: boolean; missingVariables: string[]; syntaxError?: string} {
  try {
    // First, check if template is valid Mustache syntax
    Mustache.parse(template);

    // Extract variable references
    const references = extractVariableReferences(template);
    const missingVariables: string[] = [];

    for (const ref of references) {
      const baseName = ref.split('.')[0];
      if (!(baseName in definitions)) {
        missingVariables.push(baseName);
      }
    }

    return {
      valid: missingVariables.length === 0,
      missingVariables: [...new Set(missingVariables)],
    };
  } catch (error) {
    // Template has syntax errors
    return {
      valid: false,
      missingVariables: [],
      syntaxError:
        error instanceof Error ? error.message : 'Invalid template syntax',
    };
  }
}

/** Validate that cohort variables match their definitions */
export function validateCohortVariables(
  cohort: VariableCohort,
  definitions: Record<string, VariableDefinition>,
): {valid: boolean; errors: string[]} {
  const errors: string[] = [];

  // Check each variable in the cohort
  for (const [name, value] of Object.entries(cohort.variables)) {
    const definition = definitions[name];

    if (!definition) {
      errors.push(`Variable "${name}" is not defined`);
      continue;
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (definition.type === 'object') {
      if (actualType !== 'object' || value === null) {
        errors.push(
          `Variable "${name}" should be an object but got ${actualType}`,
        );
      } else if (
        definition.schema &&
        typeof value === 'object' &&
        value !== null
      ) {
        // Validate object properties against schema
        const objValue = value as Record<string, unknown>;
        for (const [prop, propSchema] of Object.entries(definition.schema)) {
          if (prop in objValue) {
            const propType = typeof objValue[prop];
            if (propType !== propSchema.type) {
              errors.push(
                `Property "${name}.${prop}" should be ${propSchema.type} but got ${propType}`,
              );
            }
          }
        }
      }
    } else if (actualType !== definition.type) {
      errors.push(
        `Variable "${name}" should be ${definition.type} but got ${actualType}`,
      );
    }
  }

  // Check for required variables (those without defaults)
  for (const [name, definition] of Object.entries(definitions)) {
    if (definition.defaultValue === undefined && !(name in cohort.variables)) {
      errors.push(`Required variable "${name}" is missing`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ************************************************************************* //
// Template Preview
// ************************************************************************* //

/**
 * Generate preview of template with sample or actual cohort values
 * Useful for showing experimenters how their templates will look
 */
export function previewTemplate(
  template: string,
  definitions: Record<string, VariableDefinition>,
  cohortVariables?: Record<string, VariableValue>,
): string {
  // Use provided cohort variables or generate sample values
  const variables = cohortVariables || generateSampleValues(definitions);
  return resolveTemplate(template, variables);
}

/**
 * Generate sample values for preview purposes
 * Creates readable placeholder values for each variable type
 */
function generateSampleValues(
  definitions: Record<string, VariableDefinition>,
): Record<string, VariableValue> {
  const samples: Record<string, VariableValue> = {};

  for (const [name, definition] of Object.entries(definitions)) {
    // Use default if specified, otherwise generate sample
    if (definition.defaultValue !== undefined) {
      samples[name] = definition.defaultValue;
    } else if (definition.type === 'object' && definition.schema) {
      // For objects, generate sample for each property
      const obj: Record<string, VariableValue> = {};
      for (const [prop, propSchema] of Object.entries(definition.schema)) {
        obj[prop] = getSampleValue(prop, propSchema.type);
      }
      samples[name] = obj;
    } else {
      samples[name] = getSampleValue(name, definition.type);
    }
  }

  return samples;
}

/** Get a sample value for a given type */
function getSampleValue(name: string, type: string): VariableValue {
  switch (type) {
    case 'string':
      return `[${name}]`;
    case 'number':
      return 42;
    case 'boolean':
      return true;
    case 'object':
      return {};
    default:
      return null;
  }
}
