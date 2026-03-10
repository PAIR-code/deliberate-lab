/**
 * Legacy variable config migration utilities.
 *
 * This module provides backwards compatibility for old variable config formats
 * that used different structures. The migration functions convert these old
 * formats to the current format transparently.
 *
 * Format history:
 *
 * V1 (commits c6a19676, f844e698) - original format:
 *   { variableNames, variableType, variableSchema?, seedStrategy?, values }
 *   - variableType: 'string' | 'number' | 'boolean' | 'object'
 *   - variableSchema: Record<string, VariableType> (only for objects)
 *   - seedStrategy was added in f844e698, may be absent in earliest configs
 *
 * V2 (commit e348d933) - added full JSON Schema support:
 *   { variableNames, schema (TSchema), seedStrategy, values }
 *   - Replaced variableType + variableSchema with a single TSchema field
 *
 * V3 (current format):
 *   { definition: { name, description, schema }, scope, shuffleConfig, values, ... }
 */

import {Type, type TSchema} from '@sinclair/typebox';
import {generateId} from './shared';
import {SeedStrategy, createShuffleConfig} from './utils/random.utils';
import {
  RandomPermutationVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableScope,
  VariableType,
} from './variables';

// ************************************************************************* //
// OLD FORMAT TYPES (for reference and migration)                            //
// ************************************************************************* //

/** V1 variable type enum values (as stored in Firestore). */
type OldVariableType = 'string' | 'number' | 'boolean' | 'object';

/**
 * V1 format (commits c6a19676, f844e698).
 * Used variableType enum + optional variableSchema for objects.
 */
export interface V1RandomPermutationVariableConfig {
  id: string;
  type: VariableConfigType.RANDOM_PERMUTATION;
  seedStrategy?: SeedStrategy; // absent in earliest configs (c6a19676)
  variableNames: string[];
  variableType: OldVariableType;
  variableSchema?: Record<string, OldVariableType>; // only for objects
  values: string[];
}

/**
 * V2 format (commit e348d933).
 * Replaced variableType + variableSchema with full JSON Schema (TSchema).
 */
export interface V2RandomPermutationVariableConfig {
  id: string;
  type: VariableConfigType.RANDOM_PERMUTATION;
  seedStrategy: SeedStrategy;
  variableNames: string[];
  schema: TSchema;
  values: string[];
}

/** Union of all legacy config types. */
export type LegacyVariableConfig =
  | V1RandomPermutationVariableConfig
  | V2RandomPermutationVariableConfig;

// ************************************************************************* //
// DETECTION UTILITIES                                                       //
// ************************************************************************* //

/**
 * Type guard to detect V1 format configs.
 * V1 configs have `variableType` and lack `definition`.
 */
export function isV1FormatConfig(
  config: VariableConfig | LegacyVariableConfig,
): config is V1RandomPermutationVariableConfig {
  return 'variableType' in config && !('definition' in config);
}

/**
 * Type guard to detect V2 format configs.
 * V2 configs have `schema` + `variableNames` at top level and lack `definition`.
 */
export function isV2FormatConfig(
  config: VariableConfig | LegacyVariableConfig,
): config is V2RandomPermutationVariableConfig {
  return (
    'schema' in config && 'variableNames' in config && !('definition' in config)
  );
}

/**
 * Type guard to detect any old-format variable config (V1 or V2).
 */
export function isOldFormatConfig(
  config: VariableConfig | LegacyVariableConfig,
): config is LegacyVariableConfig {
  return isV1FormatConfig(config) || isV2FormatConfig(config);
}

// ************************************************************************* //
// SCHEMA CONVERSION                                                         //
// ************************************************************************* //

/**
 * Convert a V1 OldVariableType string to a TypeBox TSchema.
 */
function oldVariableTypeToSchema(variableType: OldVariableType): TSchema {
  switch (variableType) {
    case 'string':
      return Type.String();
    case 'number':
      return Type.Number();
    case 'boolean':
      return Type.Boolean();
    default:
      return Type.String();
  }
}

/**
 * Convert V1 variableType + variableSchema into a TSchema.
 *
 * For primitive types (string, number, boolean), returns the corresponding
 * TypeBox schema directly. For objects, builds a Type.Object() from the
 * variableSchema record.
 */
export function v1SchemaToTSchema(
  variableType: OldVariableType,
  variableSchema?: Record<string, OldVariableType>,
): TSchema {
  if (variableType === 'object' && variableSchema) {
    const properties: Record<string, TSchema> = {};
    for (const [key, type] of Object.entries(variableSchema)) {
      properties[key] = oldVariableTypeToSchema(type);
    }
    return Type.Object(properties);
  }
  return oldVariableTypeToSchema(variableType);
}

// ************************************************************************* //
// MIGRATION UTILITIES                                                       //
// ************************************************************************* //

/**
 * Maps old SeedStrategy to new VariableScope.
 * The old seedStrategy controlled both randomization seed AND storage scope.
 * In the new format, these are separate concerns, but for migration we use
 * the seedStrategy to determine both.
 */
function mapSeedStrategyToScope(seedStrategy: SeedStrategy): VariableScope {
  switch (seedStrategy) {
    case SeedStrategy.EXPERIMENT:
      return VariableScope.EXPERIMENT;
    case SeedStrategy.COHORT:
      return VariableScope.COHORT;
    case SeedStrategy.PARTICIPANT:
    case SeedStrategy.CUSTOM:
    default:
      return VariableScope.PARTICIPANT;
  }
}

/**
 * Shared migration logic for V1 and V2 configs.
 * Both formats share the same structure except for how the item schema is
 * represented, so this function takes the already-resolved TSchema.
 */
function migrateToV3(
  id: string,
  variableNames: string[],
  seedStrategy: SeedStrategy | undefined,
  itemSchema: TSchema,
  values: string[],
): RandomPermutationVariableConfig {
  const resolvedSeedStrategy = seedStrategy ?? SeedStrategy.PARTICIPANT;
  const scope = mapSeedStrategyToScope(resolvedSeedStrategy);

  // Determine base variable name
  // Old format could have multiple names like ["charity_1", "charity_2"]
  // We extract the base name by removing trailing _N suffix if present
  const firstName = variableNames[0] || 'variable';
  const baseName = firstName.replace(/_\d+$/, '');

  return {
    id: id || generateId(),
    type: VariableConfigType.RANDOM_PERMUTATION,
    scope,
    definition: {
      name: baseName,
      description: '',
      // Wrap in array type since RandomPermutation produces arrays
      schema: VariableType.array(itemSchema),
    },
    shuffleConfig: createShuffleConfig({
      shuffle: true,
      seed: resolvedSeedStrategy,
    }),
    values,
    numToSelect: variableNames.length,
    // Enable expansion to create separate variables (charity_1, charity_2, etc.)
    expandListToSeparateVariables: variableNames.length > 1,
  };
}

/**
 * Migrate a single old-format variable config to the current format.
 * Returns the migrated config, or the original if already in current format.
 * Returns null if migration fails.
 */
export function migrateVariableConfig(
  config: VariableConfig | LegacyVariableConfig,
): VariableConfig | null {
  // If already in current format, return as-is
  if (!isOldFormatConfig(config)) {
    return config;
  }

  if (config.type !== VariableConfigType.RANDOM_PERMUTATION) {
    console.warn(
      'Unknown old variable config format, skipping migration:',
      config,
    );
    return null;
  }

  // V1: convert variableType + variableSchema to TSchema first
  if (isV1FormatConfig(config)) {
    const itemSchema = v1SchemaToTSchema(
      config.variableType,
      config.variableSchema,
    );

    const migrated = migrateToV3(
      config.id,
      config.variableNames,
      config.seedStrategy,
      itemSchema,
      config.values,
    );

    console.info(
      `Migrated V1 variable config "${config.variableNames[0] || config.id}" to current format`,
    );

    return migrated;
  }

  // V2: schema is already a TSchema
  if (isV2FormatConfig(config)) {
    const migrated = migrateToV3(
      config.id,
      config.variableNames,
      config.seedStrategy,
      config.schema,
      config.values,
    );

    console.info(
      `Migrated V2 variable config "${config.variableNames[0] || config.id}" to current format`,
    );

    return migrated;
  }

  console.warn(
    'Unknown old variable config format, skipping migration:',
    config,
  );
  return null;
}

/**
 * Migrate an array of variable configs, filtering out any that fail migration.
 * This is the main entry point for migrating experiment variable configs.
 */
export function migrateVariableConfigs(
  configs: (VariableConfig | LegacyVariableConfig)[],
): VariableConfig[] {
  const migrated: VariableConfig[] = [];

  for (const config of configs) {
    const result = migrateVariableConfig(config);
    if (result !== null) {
      migrated.push(result);
    }
  }

  return migrated;
}
