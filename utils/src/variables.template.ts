import Mustache from 'mustache';
import type {TSchema} from '@sinclair/typebox';
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
 * by checking each level exists in the schema. Numeric array indices are
 * skipped since we can't validate them statically.
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

      // Check if base variable exists
      const baseVariable = variableMap[baseName];
      if (!baseVariable) {
        missingVariables.push(baseName);
        continue;
      }

      // Validate nested path access using JSON Schema (TypeBox)
      let currentSchema: TSchema = baseVariable.schema;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];

        // Skip numeric array indices (e.g., 0, 1, 2...)
        // After a numeric index, we're accessing array item properties
        if (/^\d+$/.test(part)) {
          // For arrays, navigate to the items schema
          if (
            currentSchema.type === 'array' &&
            'items' in currentSchema &&
            currentSchema.items
          ) {
            currentSchema = currentSchema.items as TSchema;
          }
          continue;
        }

        // For objects, check if the property exists
        if (currentSchema.type === 'object') {
          const properties =
            'properties' in currentSchema
              ? currentSchema.properties
              : undefined;
          if (!properties || !properties[part]) {
            missingVariables.push(parts.slice(0, i + 1).join('.'));
            break;
          }
          currentSchema = properties[part] as TSchema;
        } else {
          // Not an object, can't access properties
          missingVariables.push(parts.slice(0, i + 1).join('.'));
          break;
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
