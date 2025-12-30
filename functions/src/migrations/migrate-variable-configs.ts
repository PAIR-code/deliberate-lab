/**
 * One-time migration script to convert old variable configs (pre-v19) to new format.
 *
 * This script:
 * 1. Queries experiments created on or after Nov 3, 2025 (when the variable feature
 *    was introduced in commit c6a19676)
 * 2. Checks if any have old-format variable configs
 * 3. Migrates them to the new format
 * 4. Updates the documents in Firestore
 *
 * Usage:
 *   cd functions
 *   npm run migrate:variable-configs:dry-run  # Preview changes
 *   npm run migrate:variable-configs          # Apply changes
 *
 * Or directly:
 *   npx tsx src/migrations/migrate-variable-configs.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without writing to database
 */

import * as admin from 'firebase-admin';
import {type TSchema} from '@sinclair/typebox';
import {
  Experiment,
  RandomPermutationVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableScope,
  VariableType,
  EXPERIMENT_VERSION_ID,
  generateId,
  SeedStrategy,
  createShuffleConfig,
} from '@deliberation-lab/utils';

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS or emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'deliberate-lab',
  });
}

const db = admin.firestore();

// ************************************************************************* //
// DATE FILTER FOR VARIABLE FEATURE                                          //
// ************************************************************************* //

// The RandomPermutationVariableConfig feature was introduced on Nov 3, 2025
// (commit c6a19676). Only experiments created on or after this date could
// have variable configs that need migration.
const VARIABLE_FEATURE_START_DATE = new Date('2025-11-03T00:00:00Z');

// ************************************************************************* //
// OLD FORMAT TYPES                                                          //
// ************************************************************************* //

interface OldRandomPermutationVariableConfig {
  id: string;
  type: VariableConfigType.RANDOM_PERMUTATION;
  seedStrategy: SeedStrategy;
  variableNames: string[];
  schema: TSchema;
  values: string[];
}

type LegacyOrNewConfig = VariableConfig | OldRandomPermutationVariableConfig;

// ************************************************************************* //
// MIGRATION LOGIC                                                           //
// ************************************************************************* //

function isOldFormatConfig(
  config: LegacyOrNewConfig,
): config is OldRandomPermutationVariableConfig {
  return (
    'variableNames' in config && 'schema' in config && !('definition' in config)
  );
}

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

function migrateVariableConfig(
  config: LegacyOrNewConfig,
): VariableConfig | null {
  if (!isOldFormatConfig(config)) {
    return config;
  }

  if (config.type === VariableConfigType.RANDOM_PERMUTATION) {
    const oldConfig = config;
    const scope = mapSeedStrategyToScope(oldConfig.seedStrategy);

    const firstName = oldConfig.variableNames[0] || 'variable';
    const baseName = firstName.replace(/_\d+$/, '');

    return {
      id: oldConfig.id || generateId(),
      type: VariableConfigType.RANDOM_PERMUTATION,
      scope,
      definition: {
        name: baseName,
        description: '',
        schema: VariableType.array(oldConfig.schema),
      },
      shuffleConfig: createShuffleConfig({
        shuffle: true,
        seed: oldConfig.seedStrategy,
      }),
      values: oldConfig.values,
      numToSelect: oldConfig.variableNames.length,
      expandListToSeparateVariables: oldConfig.variableNames.length > 1,
    };
  }

  console.warn(`Unknown old config type, skipping:`, config);
  return null;
}

function migrateVariableConfigs(
  configs: LegacyOrNewConfig[],
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

// ************************************************************************* //
// MAIN MIGRATION SCRIPT                                                     //
// ************************************************************************* //

interface MigrationResult {
  experimentId: string;
  experimentName: string;
  versionId: number;
  dateCreated: string;
  hadOldConfigs: boolean;
  configCount: number;
  migratedCount: number;
  error?: string;
}

async function migrateExperiments(dryRun: boolean): Promise<MigrationResult[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Variable Config Migration Script`);
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (no changes will be written)' : 'LIVE'}`,
  );
  console.log(`${'='.repeat(60)}\n`);

  // Convert start date to Firestore Timestamp
  const startTimestamp = admin.firestore.Timestamp.fromDate(
    VARIABLE_FEATURE_START_DATE,
  );

  console.log(
    `Filtering experiments created on or after: ${VARIABLE_FEATURE_START_DATE.toISOString()}\n`,
  );

  const results: MigrationResult[] = [];

  // Query experiments created on or after the variable feature was introduced
  const experimentsSnapshot = await db
    .collection('experiments')
    .where('metadata.dateCreated', '>=', startTimestamp)
    .get();
  console.log(`Found ${experimentsSnapshot.size} experiments to check.\n`);

  for (const doc of experimentsSnapshot.docs) {
    const experiment = doc.data() as Experiment;
    const experimentId = doc.id;
    const experimentName = experiment.metadata?.name || 'Unnamed';
    const dateCreated = experiment.metadata?.dateCreated
      ? new Date(experiment.metadata.dateCreated.seconds * 1000)
          .toISOString()
          .split('T')[0]
      : 'unknown';

    const result: MigrationResult = {
      experimentId,
      experimentName,
      versionId: experiment.versionId || 0,
      dateCreated,
      hadOldConfigs: false,
      configCount: 0,
      migratedCount: 0,
    };

    try {
      const variableConfigs = experiment.variableConfigs || [];
      result.configCount = variableConfigs.length;

      if (variableConfigs.length === 0) {
        results.push(result);
        continue;
      }

      // Check if any configs are in old format
      const hasOldConfigs = variableConfigs.some(isOldFormatConfig);

      if (!hasOldConfigs) {
        results.push(result);
        continue;
      }

      result.hadOldConfigs = true;

      // Migrate the configs
      const migratedConfigs = migrateVariableConfigs(variableConfigs);
      result.migratedCount = migratedConfigs.length;

      console.log(
        `\n[${experimentId}] "${experimentName}" (v${experiment.versionId})`,
      );
      const oldConfigCount = variableConfigs.filter(isOldFormatConfig).length;
      console.log(
        `  - Found ${oldConfigCount} old-format variable config(s) out of ${variableConfigs.length} total`,
      );

      // Show what will be migrated (only old configs)
      for (const config of variableConfigs) {
        if (isOldFormatConfig(config)) {
          const migratedConfig = migrateVariableConfig(config);
          console.log(`  - Config "${config.variableNames?.join(', ')}":`);
          console.log(
            `      Old: variableNames=[${config.variableNames?.join(', ')}], seedStrategy=${config.seedStrategy}`,
          );
          if (
            migratedConfig &&
            migratedConfig.type === VariableConfigType.RANDOM_PERMUTATION
          ) {
            const migrated = migratedConfig as RandomPermutationVariableConfig;
            console.log(
              `      New: definition.name="${migrated.definition?.name}", scope=${migrated.scope}, expandListToSeparateVariables=${migrated.expandListToSeparateVariables}`,
            );
          } else {
            console.log(`      New: FAILED TO MIGRATE`);
          }
        }
      }

      if (!dryRun) {
        // Update the experiment document
        await doc.ref.update({
          variableConfigs: migratedConfigs,
          versionId: EXPERIMENT_VERSION_ID,
        });
        console.log(`  - Updated experiment in Firestore`);
      } else {
        console.log(`  - [DRY RUN] Would update experiment in Firestore`);
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`  - Error: ${result.error}`);
    }

    results.push(result);
  }

  return results;
}

function printSummary(results: MigrationResult[], dryRun: boolean) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('MIGRATION SUMMARY');
  console.log(`${'='.repeat(60)}\n`);

  const total = results.length;
  const withOldConfigs = results.filter((r) => r.hadOldConfigs).length;
  const errors = results.filter((r) => r.error).length;

  console.log(`Total experiments checked: ${total}`);
  console.log(`Experiments with old configs: ${withOldConfigs}`);
  console.log(`Errors: ${errors}`);

  if (withOldConfigs > 0) {
    console.log(`\nExperiments that ${dryRun ? 'would be' : 'were'} migrated:`);
    for (const result of results.filter((r) => r.hadOldConfigs)) {
      const status = result.error
        ? `ERROR: ${result.error}`
        : dryRun
          ? 'would migrate'
          : 'migrated';
      console.log(
        `  - [${result.experimentId}] "${result.experimentName}" (v${result.versionId}, created ${result.dateCreated}) - ${status}`,
      );
    }
  }

  if (dryRun && withOldConfigs > 0) {
    console.log(`\nTo apply these changes, run without --dry-run flag.`);
  }
}

// ************************************************************************* //
// ENTRY POINT                                                               //
// ************************************************************************* //

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    const results = await migrateExperiments(dryRun);
    printSummary(results, dryRun);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
