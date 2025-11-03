import Mustache from 'mustache';
import {VariableItem, VariableType} from './variables';

/**
 * Validate that a template's variable references are defined.
 * Also validates that the template is valid Mustache syntax.
 */
export function validateTemplateVariables(
  template: string,
  variableMap: Record<string, VariableItem> = {},
): {valid: boolean; missingVariables: string[]; syntaxError?: string} {
  try {
    // First, check if template is valid Mustache syntax
    Mustache.parse(template);

    // Extract variable references
    const references = extractVariableReferences(template);
    const missingVariables: string[] = [];

    for (const ref of references) {
      const refParts = ref.split('.');
      const baseName = refParts[0];
      const variable = variableMap[baseName];
      if (!variable) {
        missingVariables.push(baseName);
      } else if (refParts.length > 1) {
        // If variable is an object, check if field exists
        const field = refParts[1];
        if (
          variable.type !== VariableType.OBJECT ||
          (variable.schema && !variable.schema[field])
        ) {
          missingVariables.push(ref);
        }
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
