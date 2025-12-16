/**
 * Export TypeBox schemas as JSON Schema for use in other languages (e.g., Python).
 *
 * Run with: npx tsx src/export-schemas.ts
 * Output: ../docs/_data/schemas.json
 *
 * Schemas with $id are automatically collected and added to $defs for deduplication.
 * To add a new schema, just add $id to its TypeBox definition - no changes needed here.
 */

import * as fs from 'fs';
import * as path from 'path';
import {Type} from '@sinclair/typebox';

// Import top-level schemas
import {StageConfigData, CONFIG_DATA} from './stages/stage.validation';
import {ExperimentCreationData} from './experiment.validation';
import {
  CohortCreationData,
  UpdateCohortMetadataData,
} from './cohort.validation';

/**
 * Recursively collect all schemas with $id from a schema tree.
 * These will be added to $defs for deduplication.
 */
function collectSchemasWithId(
  obj: unknown,
  collected: Map<string, unknown>,
  visited = new WeakSet<object>(),
): void {
  if (obj === null || typeof obj !== 'object') {
    return;
  }

  // Prevent infinite recursion on circular references
  if (visited.has(obj as object)) {
    return;
  }
  visited.add(obj as object);

  const record = obj as Record<string, unknown>;

  // If this schema has $id, collect it
  if (record.$id && typeof record.$id === 'string') {
    collected.set(record.$id, obj);
  }

  // Recurse into all properties
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectSchemasWithId(item, collected, visited);
      }
    } else if (typeof value === 'object' && value !== null) {
      collectSchemasWithId(value, collected, visited);
    }
  }
}

// Create base schema with top-level types
const baseSchema = Type.Object(
  {
    stage: StageConfigData,
    experimentCreation: ExperimentCreationData,
    cohortCreation: CohortCreationData,
    cohortUpdate: UpdateCohortMetadataData,
  },
  {
    $id: 'DeliberateLabSchemas',
    title: 'Deliberate Lab API Schemas',
    description: 'JSON Schema definitions for Deliberate Lab API request types',
  },
);

// Collect all schemas with $id from the schema tree
const collectedSchemas = new Map<string, unknown>();
collectSchemasWithId(baseSchema, collectedSchemas);

// Also collect from individual stage configs (for stage-specific naming)
for (const [key, schema] of Object.entries(CONFIG_DATA)) {
  const stageName = `${key.charAt(0).toUpperCase() + key.slice(1)}StageConfig`;
  collectedSchemas.set(stageName, schema);
  collectSchemasWithId(schema, collectedSchemas);
}

// Build $defs from collected schemas (excluding the root schema)
const $defs: Record<string, unknown> = {};
for (const [id, schema] of collectedSchemas) {
  if (id !== 'DeliberateLabSchemas') {
    $defs[id] = schema;
  }
}

// Create final schema with $defs
const combinedSchema = Type.Object(
  {
    stage: StageConfigData,
    experimentCreation: ExperimentCreationData,
    cohortCreation: CohortCreationData,
    cohortUpdate: UpdateCohortMetadataData,
  },
  {
    $id: 'DeliberateLabSchemas',
    title: 'Deliberate Lab API Schemas',
    description: 'JSON Schema definitions for Deliberate Lab API request types',
    $defs,
  },
);

/**
 * Extract discriminator value from an object schema.
 * Looks for properties like { kind: { const: 'text' } } or { kind: { type: 'string', const: 'text' } }
 */
function getDiscriminatorValue(schema: Record<string, unknown>): string | null {
  const properties = schema.properties as Record<string, unknown> | undefined;
  if (!properties) return null;

  // Check common discriminator field names
  for (const field of ['kind', 'type']) {
    const prop = properties[field] as Record<string, unknown> | undefined;
    if (prop?.const && typeof prop.const === 'string') {
      return prop.const as string;
    }
  }
  return null;
}

/**
 * Convert a discriminator value to a PascalCase class name.
 * e.g., 'text' -> 'Text', 'multipleChoice' -> 'MultipleChoice', 'SCALE' -> 'Scale'
 */
function discriminatorToClassName(value: string): string {
  // Handle SCREAMING_SNAKE_CASE
  if (value === value.toUpperCase() && value.includes('_')) {
    return value
      .toLowerCase()
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join('');
  }
  // Handle ALLCAPS
  if (value === value.toUpperCase()) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
  // Handle camelCase or lowercase
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Fix TypeBox $ref format to standard JSON Schema format.
 * TypeBox uses "$ref": "SchemaName" but JSON Schema expects "$ref": "#/$defs/SchemaName"
 * Also converts $id to title for better Python class naming.
 *
 * @param obj - The schema object to fix
 * @param parentKey - The key this object is stored under in its parent
 * @param typeContext - Context like 'Question', 'StageConfig' for discriminated unions
 * @param arrayContext - The property name if this is inside an array's items
 */
function fixRefs(
  obj: unknown,
  parentKey?: string,
  typeContext?: string,
  arrayContext?: string,
): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      fixRefs(item, parentKey, typeContext, arrayContext),
    );
  }

  const result: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;

  // Determine type context for discriminated unions
  let newTypeContext = typeContext;
  if (parentKey) {
    const keyLower = parentKey.toLowerCase();
    if (keyLower.includes('question')) newTypeContext = 'Question';
    else if (keyLower.includes('stageconfig') || keyLower === 'stage')
      newTypeContext = 'StageConfig';
    else if (keyLower.includes('answer')) newTypeContext = 'Answer';
    else if (keyLower.includes('condition')) newTypeContext = 'Condition';
  }

  // Track array context for item naming
  const newArrayContext = arrayContext;

  for (const [key, value] of Object.entries(record)) {
    if (key === '$ref' && typeof value === 'string' && !value.startsWith('#')) {
      result[key] = `#/$defs/${value}`;
    } else if (key === '$id' && typeof value === 'string') {
      // Convert $id to title for better Python class naming
      result.title = value;
    } else if (key === 'items' && typeof value === 'object') {
      // This is an array items schema - pass the parent key as array context
      result[key] = fixRefs(value, key, newTypeContext, parentKey);
    } else {
      result[key] = fixRefs(value, key, newTypeContext, newArrayContext);
    }
  }

  // Add title to objects based on discriminator, array context, or parent key
  if (record.type === 'object' && !result.title) {
    const discriminator = getDiscriminatorValue(record);
    if (discriminator) {
      // Discriminated union: use discriminator + type context
      const baseName = discriminatorToClassName(discriminator);
      result.title = baseName + (newTypeContext || '');
    } else if (arrayContext && parentKey === 'items') {
      // Array item: use singular form of array property name
      const singular = arrayContext.replace(/s$/, '').replace(/Data$/, 'Item');
      result.title = singular.charAt(0).toUpperCase() + singular.slice(1);
    } else if (
      parentKey &&
      !parentKey.startsWith('$') &&
      parentKey !== 'items'
    ) {
      // Fall back to parent key
      result.title = parentKey.charAt(0).toUpperCase() + parentKey.slice(1);
    }
  }

  return result;
}

const fixedSchema = fixRefs(combinedSchema) as Record<string, unknown>;
// Restore root $id
fixedSchema.$id = 'DeliberateLabSchemas';

/**
 * Simplify allOf structures created by Type.Composite.
 *
 * When Type.Composite combines a base schema (with anyOf for multiple type options)
 * and a specific schema (with const for one specific type), it creates:
 *   { allOf: [{ anyOf: [...] }, { const: "specific", default: "specific" }] }
 *
 * This is semantically correct but too complex for datamodel-codegen to parse.
 * We simplify it to just the const schema since it's the more specific constraint.
 */
function simplifyAllOf(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => simplifyAllOf(item));
  }

  const record = obj as Record<string, unknown>;

  // Check if this is an allOf that can be simplified
  if (Array.isArray(record.allOf) && record.allOf.length === 2) {
    const [first, second] = record.allOf as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];

    // Pattern: allOf with anyOf (union) + const (specific value)
    // Keep only the const schema since it's more specific
    if (first.anyOf && second.const !== undefined) {
      return simplifyAllOf(second);
    }
    if (second.anyOf && first.const !== undefined) {
      return simplifyAllOf(first);
    }
  }

  // Recursively process all properties
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = simplifyAllOf(value);
  }
  return result;
}

const simplifiedSchema = simplifyAllOf(fixedSchema) as Record<string, unknown>;
simplifiedSchema.$id = 'DeliberateLabSchemas';

/**
 * Second pass: replace inline schemas that have the same title as a $defs entry with $refs.
 * This deduplicates schemas that appear multiple times inline.
 */
function deduplicateWithRefs(
  obj: unknown,
  defs: Record<string, unknown>,
  inDefs = false,
): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deduplicateWithRefs(item, defs, inDefs));
  }

  const record = obj as Record<string, unknown>;

  // Skip if already a $ref
  if (record.$ref) {
    return record;
  }

  // Check if this schema has a title that matches a $defs entry
  // Works for both type: 'object' and anyOf/oneOf union members
  const title = record.title as string | undefined;
  if (title && defs[title] && !inDefs) {
    // Replace with $ref if it's an object type OR has properties (union member)
    if (record.type === 'object' || record.properties) {
      return {$ref: `#/$defs/${title}`};
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === '$defs') {
      // Process $defs entries - mark as inDefs only for the immediate children (the def keys themselves)
      const defsObj = value as Record<string, unknown>;
      const processedDefs: Record<string, unknown> = {};
      for (const [defKey, defValue] of Object.entries(defsObj)) {
        // Process the definition content but don't replace the root object (it IS the def)
        // However, nested schemas inside should be replaced
        const defRecord = defValue as Record<string, unknown>;
        const processedDef: Record<string, unknown> = {};
        for (const [propKey, propValue] of Object.entries(defRecord)) {
          // Recursively process nested content, not marked as inDefs
          processedDef[propKey] = deduplicateWithRefs(propValue, defs, false);
        }
        processedDefs[defKey] = processedDef;
      }
      result[key] = processedDefs;
    } else {
      result[key] = deduplicateWithRefs(value, defs, inDefs);
    }
  }
  return result;
}

// Get $defs from the schema
const defs = (simplifiedSchema.$defs || {}) as Record<string, unknown>;

// Deduplicate inline schemas
const deduplicatedSchema = deduplicateWithRefs(
  simplifiedSchema,
  defs,
) as Record<string, unknown>;
deduplicatedSchema.$id = 'DeliberateLabSchemas';

// Write to docs/assets/api for public access
const outputPath = path.join(__dirname, '../../docs/assets/api/schemas.json');
fs.writeFileSync(outputPath, JSON.stringify(deduplicatedSchema, null, 2));

console.log(`Schemas exported to ${outputPath}`);
