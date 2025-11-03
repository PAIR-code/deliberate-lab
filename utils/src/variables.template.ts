import Mustache from 'mustache';

/**
 * Validate that a template's variable references are defined.
 * Also validates that the template is valid Mustache syntax.
 */
export function validateTemplateVariables(
  template: string,
  // Temporary map for variable name to value
  variableMap: Record<string, string> = {},
): {valid: boolean; missingVariables: string[]; syntaxError?: string} {
  try {
    // First, check if template is valid Mustache syntax
    Mustache.parse(template);

    // Extract variable references
    const references = extractVariableReferences(template);
    const missingVariables: string[] = [];

    for (const ref of references) {
      const baseName = ref.split('.')[0];
      // TODO: Once variables can also be objects, confirm that if the
      // template references a specific field {{item.name}}, that field exists
      if (!variableMap[baseName]) {
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
