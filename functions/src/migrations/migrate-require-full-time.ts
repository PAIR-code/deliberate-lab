/**
 * One-time migration script to convert requireFullTime to timeMinimumInMinutes.
 *
 * For any stage with requireFullTime: true, this sets
 * timeMinimumInMinutes = timeLimitInMinutes (making the minimum equal to the
 * maximum, which is the equivalent behavior).
 *
 * Usage:
 *   cd functions
 *   npm run migrate:require-full-time            # Preview changes (dry run)
 *   npm run migrate:require-full-time:apply      # Apply changes
 *
 * Options:
 *   --apply    Apply changes (default is dry run)
 */

import * as admin from 'firebase-admin';
import * as readline from 'readline';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'deliberate-lab',
  });
}

const db = admin.firestore();

interface StageMigration {
  stageId: string;
  stageName: string;
  stageKind: string;
  timeLimitInMinutes: number | null;
  error?: string;
}

interface ExperimentMigration {
  experimentId: string;
  experimentName: string;
  dateCreated: string;
  stages: StageMigration[];
}

async function migrateStages(dryRun: boolean): Promise<ExperimentMigration[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`requireFullTime → timeMinimumInMinutes Migration`);
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (no changes will be written)' : 'LIVE'}`,
  );
  console.log(`${'='.repeat(60)}\n`);

  const experiments: ExperimentMigration[] = [];

  const experimentsSnapshot = await db.collection('experiments').get();
  console.log(`Found ${experimentsSnapshot.size} experiments to check.\n`);

  const sortedDocs = [...experimentsSnapshot.docs].sort((a, b) => {
    const aTime = a.data()?.metadata?.dateCreated?.seconds ?? 0;
    const bTime = b.data()?.metadata?.dateCreated?.seconds ?? 0;
    return aTime - bTime;
  });

  for (const experimentDoc of sortedDocs) {
    const experimentId = experimentDoc.id;
    const experimentData = experimentDoc.data();
    const experimentName = experimentData?.metadata?.name || 'Unnamed';
    const dateCreated = experimentData?.metadata?.dateCreated?.seconds
      ? new Date(experimentData.metadata.dateCreated.seconds * 1000)
          .toISOString()
          .split('T')[0]
      : 'unknown';
    const stagesSnapshot = await db
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .get();

    const stages: StageMigration[] = [];

    for (const stageDoc of stagesSnapshot.docs) {
      const stage = stageDoc.data();

      if (!stage.requireFullTime) continue;

      const result: StageMigration = {
        stageId: stageDoc.id,
        stageName: stage.name || 'Unnamed',
        stageKind: stage.kind || 'unknown',
        timeLimitInMinutes: stage.timeLimitInMinutes ?? null,
      };

      try {
        const timeMinimumInMinutes = stage.timeLimitInMinutes ?? null;

        console.log(
          `  Stage "${stage.name}" (${stage.kind}): ` +
            `requireFullTime: true → timeMinimumInMinutes: ${timeMinimumInMinutes}`,
        );

        if (!dryRun) {
          await stageDoc.ref.update({
            timeMinimumInMinutes,
            requireFullTime: admin.firestore.FieldValue.delete(),
          });
          console.log(`    Updated.`);
        } else {
          console.log(`    [DRY RUN] Would update.`);
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        console.error(`    Error: ${result.error}`);
      }

      stages.push(result);
    }

    if (stages.length > 0) {
      console.log(
        `\n[${dateCreated}] ${experimentName} [${experimentId}] — ${stages.length} stage(s):`,
      );
      experiments.push({experimentId, experimentName, dateCreated, stages});
    }
  }

  return experiments;
}

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(['y', 'yes'].includes(answer.trim().toLowerCase()));
    });
  });
}

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const projectId = process.env.GCLOUD_PROJECT || 'deliberate-lab';

  console.log(`\nProject: ${projectId}`);
  console.log(
    `Mode: ${dryRun ? 'DRY RUN' : 'LIVE (will write to Firestore)'}\n`,
  );

  const confirmed = await confirm(
    `Proceed with ${dryRun ? 'dry run' : 'LIVE migration'}? (y/N): `,
  );
  if (!confirmed) {
    console.log('Aborted.');
    process.exit(0);
  }

  const experiments = await migrateStages(dryRun);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary`);
  console.log(`${'='.repeat(60)}`);

  const totalStages = experiments.reduce((sum, e) => sum + e.stages.length, 0);
  const totalErrors = experiments.reduce(
    (sum, e) => sum + e.stages.filter((s) => s.error).length,
    0,
  );

  console.log(`Experiments affected: ${experiments.length}`);
  console.log(`Stages migrated: ${totalStages}`);

  if (experiments.length > 0) {
    console.log('');
    for (const exp of experiments) {
      const errors = exp.stages.filter((s) => s.error);
      const status = errors.length > 0 ? `${errors.length} error(s)` : 'OK';
      console.log(
        `  [${exp.dateCreated}] ${exp.experimentName} [${exp.experimentId}]: ${exp.stages.length} stage(s) — ${status}`,
      );
    }
  }

  if (totalErrors > 0) {
    console.log(`\nErrors: ${totalErrors}`);
    for (const exp of experiments) {
      for (const s of exp.stages.filter((s) => s.error)) {
        console.log(`  "${exp.experimentName}" → "${s.stageName}": ${s.error}`);
      }
    }
  }

  if (dryRun && totalStages > 0) {
    console.log(`\nRun with --apply to apply changes.`);
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
