import Mustache from 'mustache';
import type {TSchema} from '@sinclair/typebox';
import {getSchemaAtPath} from './variables.utils';
import {VariableDefinition} from './variables';

/**
 * Find defined variables that are never used in a template.
 * Uses validateTemplateVariables with an empty map to extract all variable references.
 *
 * @param template The template string to check (e.g., JSON.stringify of all stages)
 * @param variableDefinitions Map of variable names to their definitions
 * @returns Array of variable names that are defined but never referenced
 */
export function findUnusedVariables(
  template: string,
  variableDefinitions: Record<string, VariableDefinition>,
): string[] {
  // With empty definitions, all variables are reported as "missing"
  const {missingVariables} = validateTemplateVariables(template, {});

  // Extract root variable names from full paths (e.g., "charity" from "charity.name")
  const usedRootNames = new Set<string>();
  for (const path of missingVariables) {
    const rootName = path.split('.')[0];
    usedRootNames.add(rootName);
  }

  const definedNames = Object.keys(variableDefinitions);
  return definedNames.filter((name) => !usedRootNames.has(name));
}

/**
 * Resolve Mustache template variables in a given string.
 * https://mustache.github.io/mustache.5.html
 */
export function resolveTemplateVariables(
  template: string,
  variableDefinitions: Record<string, VariableDefinition>,
  valueMap: Record<string, string>,
) {
  const typedValueMap: Record<
    string,
    string | boolean | number | object | unknown[]
  > = {};
  Object.keys(valueMap).forEach((variableName) => {
    const variable = variableDefinitions[variableName];
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
 * Supports:
 * - Dotted path access (e.g., {{policy.title}})
 * - Array indices (e.g., {{items.0.name}})
 * - Sections/Iteration (e.g., {{#items}}{{name}}{{/items}}) with context stacking
 */
export function validateTemplateVariables(
  template: string,
  variableDefinitions: Record<string, VariableDefinition> = {},
): {valid: boolean; missingVariables: string[]; syntaxError?: string} {
  try {
    const tokens = Mustache.parse(template);
    const missingVariables = new Set<string>();

    // Initial schema context is the variable definitions
    // We manually construct a schema-like object to avoid TypeBox runtime overhead/recursion
    const rootSchema: TSchema = {
      type: 'object',
      properties: {},
      additionalProperties: false,
    } as unknown as TSchema;

    if (rootSchema.properties) {
      for (const [name, def] of Object.entries(variableDefinitions)) {
        rootSchema.properties[name] = def.schema;
      }
    }

    // Context stack holds schemas for each scope level
    const contextStack: TSchema[] = [rootSchema];

    validateTokens(tokens, contextStack, missingVariables);

    return {
      valid: missingVariables.size === 0,
      missingVariables: Array.from(missingVariables),
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
 * Recursively validate Mustache tokens against a context stack of schemas.
 */
function validateTokens(
  tokens: unknown[],
  contextStack: TSchema[],
  missingVariables: Set<string>,
) {
  for (const token of tokens) {
    // Mustache token format: [type, value, start, end, subTokens, index]
    if (!Array.isArray(token)) continue;
    const [type, value, , , subTokens] = token as [
      string,
      string,
      number,
      number,
      unknown[]?,
    ];

    // Handle Variable tags (name, &, {) and Section tags (#, ^)
    if (
      type === 'name' ||
      type === '#' ||
      type === '^' ||
      type === '&' ||
      type === '{'
    ) {
      // Special case: '.' refers to the current context itself
      if (value === '.') {
        continue;
      }

      const schema = resolvePathInContextStack(value, contextStack);

      if (!schema) {
        missingVariables.add(value);
      }

      // If this is a section (# or ^), recurse into sub-tokens
      if ((type === '#' || type === '^') && subTokens && schema) {
        // Push new context onto stack
        // If array, push items schema. If object, push object schema.
        let newContext: TSchema | undefined;

        if (schema.type === 'array' && 'items' in schema) {
          newContext = schema.items as TSchema;
        } else if (schema.type === 'object') {
          newContext = schema;
        }

        if (newContext) {
          contextStack.push(newContext);
          validateTokens(subTokens, contextStack, missingVariables);
          contextStack.pop();
        } else {
          // If primitive or unknown, just validate sub-tokens with current stack
          // (e.g. boolean toggle section doesn't change data context)
          validateTokens(subTokens, contextStack, missingVariables);
        }
      } else if ((type === '#' || type === '^') && subTokens && !schema) {
        // If section variable was missing, we still validate children
        // to find other potential errors, but using current stack.
        validateTokens(subTokens, contextStack, missingVariables);
      }
    }
  }
}

/**
 * Try to resolve a dotted path against schemas in the context stack,
 * searching from top (most specific) to bottom (root).
 */
function resolvePathInContextStack(
  path: string,
  contextStack: TSchema[],
): TSchema | undefined {
  // Search stack from top to bottom
  for (let i = contextStack.length - 1; i >= 0; i--) {
    const schema = getSchemaAtPath(contextStack[i], path);
    if (schema) {
      return schema;
    }
  }
  return undefined;
}
