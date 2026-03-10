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
import {
  Experiment,
  RandomPermutationVariableConfig,
  VariableConfig,
  VariableConfigType,
  EXPERIMENT_VERSION_ID,
  isOldFormatConfig,
  migrateVariableConfig,
  migrateVariableConfigs,
  LegacyVariableConfig,
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

      // Check if any configs are in old format (V1 or V2)
      const hasOldConfigs = variableConfigs.some((c) =>
        isOldFormatConfig(c as VariableConfig | LegacyVariableConfig),
      );

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
      const oldConfigs = variableConfigs.filter((c) =>
        isOldFormatConfig(c as VariableConfig | LegacyVariableConfig),
      );
      console.log(
        `  - Found ${oldConfigs.length} old-format variable config(s) out of ${variableConfigs.length} total`,
      );

      // Show what will be migrated (only old configs)
      for (const config of oldConfigs) {
        const legacyConfig = config as unknown as LegacyVariableConfig;
        const migratedConfig = migrateVariableConfig(legacyConfig);
        const varNames =
          'variableNames' in legacyConfig
            ? legacyConfig.variableNames?.join(', ')
            : config.id;
        console.log(`  - Config "${varNames}":`);
        console.log(`      Old: ${JSON.stringify(Object.keys(config))}`);
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
