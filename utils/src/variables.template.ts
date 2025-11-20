import Mustache from 'mustache';
import type {TSchema} from '@sinclair/typebox';
import {getSchemaAtPath} from './variables.utils';
import {VariableDefinition} from './variables';

/**
 * Resolve Mustache template variables in a given string.
 * https://mustache.github.io/mustache.5.html
 */
export function resolveTemplateVariables(
  template: string,
  variableMap: Record<string, VariableDefinition>,
  valueMap: Record<string, string>,
) {
  const typedValueMap: Record<
    string,
    string | boolean | number | object | unknown[]
  > = {};
  Object.keys(valueMap).forEach((variableName) => {
    const variable = variableMap[variableName];
    const schemaType = variable?.schema?.type;

    switch (schemaType) {
      case 'string':
        typedValueMap[variableName] = valueMap[variableName] ?? '';
        break;
      case 'boolean':
        typedValueMap[variableName] = valueMap[variableName] === 'true';
        break;
      case 'number':
      case 'integer':
        typedValueMap[variableName] = Number(valueMap[variableName]);
        break;
      case 'object':
      case 'array':
        // Parse JSON for complex types
        typedValueMap[variableName] = JSON.parse(valueMap[variableName]);
        break;
      default:
        break;
    }
  });

  try {
    Mustache.parse(template);
    return Mustache.render(template, typedValueMap);
  } catch (error) {
    console.warn('Failed to render Mustache template:', error);
    // Return original template string
    return template;
  }
}

/**
 * Validate that a template's variable references are defined.
 * Also validates that the template is valid Mustache syntax.
 *
 * This validates dotted path access (e.g., {{policy.arguments_pro.0.title}})
 * by checking each level exists in the schema.
 */
export function validateTemplateVariables(
  template: string,
  variableMap: Record<string, VariableDefinition> = {},
): {valid: boolean; missingVariables: string[]; syntaxError?: string} {
  try {
    // First, check if template is valid Mustache syntax
    Mustache.parse(template);

    // Extract all variable references from the template
    const references = extractVariableReferences(template);
    const missingVariables: string[] = [];

    for (const ref of references) {
      const parts = ref.split('.');
      const baseName = parts[0];
      const remainingPath = parts.slice(1).join('.');

      // Check if base variable exists
      const baseVariable = variableMap[baseName];
      if (!baseVariable) {
        missingVariables.push(baseName);
        continue;
      }

      // Validate nested path access using JSON Schema (TypeBox)
      if (remainingPath) {
        const schemaAtPath = getSchemaAtPath(
          baseVariable.schema,
          remainingPath,
        );
        if (!schemaAtPath) {
          missingVariables.push(ref);
        }
      }
    }

    return {
      valid: missingVariables.length === 0,
      missingVariables: [...new Set(missingVariables)],
    };
  } catch (error) {
    return {
      valid: false,
      missingVariables: [],
      syntaxError:
        error instanceof Error ? error.message : 'Invalid template syntax',
    };
  }
}

/**
 * Extract all variable references from a Mustache template.
 * Uses Mustache's own parser to get accurate variable names.
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
