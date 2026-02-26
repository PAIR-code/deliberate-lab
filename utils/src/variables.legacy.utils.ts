/**
 * Legacy variable config migration utilities.
 *
 * This module provides backwards compatibility for old variable config formats
 * (pre-v19) that used a different structure. The migration functions convert
 * these old formats to the new format transparently.
 */

import {generateId} from './shared';
import {SeedStrategy, createShuffleConfig} from './utils/random.utils';
import {type TSchema} from '@sinclair/typebox';
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

/**
 * Old variable config format (pre-v19) for reference.
 * These interfaces are used only for migration detection and conversion.
 */
export interface OldRandomPermutationVariableConfig {
  id: string;
  type: VariableConfigType.RANDOM_PERMUTATION;
  seedStrategy: SeedStrategy;
  variableNames: string[];
  schema: TSchema;
  values: string[];
}

// ************************************************************************* //
// MIGRATION UTILITIES                                                       //
// ************************************************************************* //

/**
 * Type guard to detect old-format variable configs.
 * Old configs have `variableNames` and `schema` at root level,
 * and lack the `definition` field.
 */
export function isOldFormatConfig(
  config: VariableConfig | OldRandomPermutationVariableConfig,
): config is OldRandomPermutationVariableConfig {
  return (
    'variableNames' in config && 'schema' in config && !('definition' in config)
  );
}

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
 * Migrate a single old-format variable config to the new format.
 * Returns the migrated config, or the original if already in new format.
 *
 * Old format had:
 * - variableNames: string[] (array of variable names)
 * - schema: TSchema (at config level)
 * - seedStrategy: SeedStrategy
 *
 * New format has:
 * - definition: { name, description, schema }
 * - scope: VariableScope
 * - shuffleConfig: ShuffleConfig
 * - expandListToSeparateVariables: boolean
 */
export function migrateVariableConfig(
  config: VariableConfig | OldRandomPermutationVariableConfig,
): VariableConfig | null {
  // If already in new format, return as-is
  if (!isOldFormatConfig(config)) {
    return config;
  }

  // Migrate old RandomPermutation format
  if (config.type === VariableConfigType.RANDOM_PERMUTATION) {
    const oldConfig = config as OldRandomPermutationVariableConfig;
    const scope = mapSeedStrategyToScope(oldConfig.seedStrategy);

    // Determine base variable name
    // Old format could have multiple names like ["charity_1", "charity_2"]
    // We extract the base name by removing trailing _N suffix if present
    const firstName = oldConfig.variableNames[0] || 'variable';
    const baseName = firstName.replace(/_\d+$/, '');

    const migratedConfig: RandomPermutationVariableConfig = {
      id: oldConfig.id || generateId(),
      type: VariableConfigType.RANDOM_PERMUTATION,
      scope,
      definition: {
        name: baseName,
        description: '',
        // Wrap in array type since RandomPermutation produces arrays
        schema: VariableType.array(oldConfig.schema),
      },
      shuffleConfig: createShuffleConfig({
        shuffle: true,
        seed: oldConfig.seedStrategy,
      }),
      values: oldConfig.values,
      numToSelect: oldConfig.variableNames.length,
      // Enable expansion to create separate variables (charity_1, charity_2, etc.)
      expandListToSeparateVariables: oldConfig.variableNames.length > 1,
    };

    console.info(
      `Migrated old variable config "${firstName}" to new format with base name "${baseName}"`,
    );

    return migratedConfig;
  }

  // Unknown old format - log warning and skip
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
  configs: (VariableConfig | OldRandomPermutationVariableConfig)[],
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
