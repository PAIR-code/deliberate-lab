/**
 * Restore experiments from a backup Firestore database to the production database.
 *
 * Both databases must be in the same Firebase project.
 *
 * Usage:
 *   cd functions
 *   npx tsx src/migrations/restore-experiment.ts --backup-db <name> <experimentId> [...]
 *   npx tsx src/migrations/restore-experiment.ts --backup-db <name> --apply <experimentId> [...]
 *
 * Options:
 *   --backup-db <name>  Name of the backup Firestore database (required)
 *   --prod-db <name>    Name of the prod Firestore database (default: the default database)
 *   --apply             Apply changes (default is dry run)
 */

import * as admin from 'firebase-admin';
import {
  DocumentData,
  DocumentReference,
  Firestore,
  getFirestore,
} from 'firebase-admin/firestore';
import * as readline from 'readline';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'deliberate-lab',
  });
}

interface WriteOp {
  ref: DocumentReference;
  data: DocumentData;
}

interface RestoreResult {
  experimentId: string;
  success: boolean;
  docCount: number;
  error?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let backupDb: string | null = null;
  let prodDb: string | null = null;
  let apply = false;
  const experimentIds: string[] = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--backup-db':
        backupDb = args[++i];
        break;
      case '--prod-db':
        prodDb = args[++i];
        break;
      case '--apply':
        apply = true;
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        experimentIds.push(args[i]);
    }
  }

  if (!backupDb) {
    console.error('Error: --backup-db is required\n');
    printUsage();
    process.exit(1);
  }

  if (experimentIds.length === 0) {
    console.error('Error: at least one experiment ID is required\n');
    printUsage();
    process.exit(1);
  }

  // Guard against restoring from a database to itself
  const resolvedProdDb = prodDb ?? '(default)';
  if (backupDb === resolvedProdDb) {
    console.error(
      `Error: backup database and prod database are the same ("${backupDb}").\n`,
    );
    process.exit(1);
  }

  return {backupDb: backupDb!, prodDb, apply, experimentIds};
}

function printUsage() {
  console.log(`Usage:
  npx tsx src/migrations/restore-experiment.ts --backup-db <name> [--prod-db <name>] [--apply] <experimentId> [...]

Options:
  --backup-db <name>  Name of the backup Firestore database (required)
  --prod-db <name>    Name of the prod Firestore database (default: the default database)
  --apply             Apply changes (default is dry run)
  -h, --help          Show this help message

Examples:
  npx tsx src/migrations/restore-experiment.ts --backup-db my-backup abc123
  npx tsx src/migrations/restore-experiment.ts --backup-db my-backup --apply abc123 def456`);
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

/**
 * Recursively collect a document and all its subcollections as write operations.
 */
async function collectDocumentTree(
  sourceDocRef: DocumentReference,
  targetDocRef: DocumentReference,
  ops: WriteOp[],
) {
  const doc = await sourceDocRef.get();
  if (!doc.exists) return;

  ops.push({ref: targetDocRef, data: doc.data()!});

  const subcollections = await sourceDocRef.listCollections();
  for (const subcol of subcollections) {
    const snapshot = await subcol.get();
    for (const subDoc of snapshot.docs) {
      await collectDocumentTree(
        subcol.doc(subDoc.id),
        targetDocRef.collection(subcol.id).doc(subDoc.id),
        ops,
      );
    }
  }
}

/**
 * Summarize the collected operations by subcollection path pattern.
 */
function summarizeOps(ops: WriteOp[], experimentId: string) {
  const prefix = `experiments/${experimentId}`;
  const counts: Record<string, number> = {};

  for (const op of ops) {
    const path = op.ref.path;
    const relative = path.slice(prefix.length + 1);
    if (!relative) {
      counts['(experiment document)'] =
        (counts['(experiment document)'] || 0) + 1;
      continue;
    }
    const parts = relative.split('/');
    const pattern = parts.map((p, i) => (i % 2 === 0 ? p : '*')).join('/');
    counts[pattern] = (counts[pattern] || 0) + 1;
  }

  for (const [pattern, count] of Object.entries(counts).sort()) {
    console.log(`    ${count.toString().padStart(5)}  ${pattern}`);
  }
}

async function restoreExperiment(
  sourceDb: Firestore,
  targetDb: Firestore,
  experimentId: string,
  dryRun: boolean,
): Promise<RestoreResult> {
  // Check experiment exists in backup
  const backupExperimentRef = sourceDb
    .collection('experiments')
    .doc(experimentId);
  const backupDoc = await backupExperimentRef.get();
  if (!backupDoc.exists) {
    const error = `Experiment ${experimentId} not found in backup database`;
    console.error(`  ERROR: ${error}`);
    return {experimentId, success: false, docCount: 0, error};
  }

  const data = backupDoc.data()!;
  const experimentName = data.metadata?.name || 'Unnamed';
  const dateCreated = data.metadata?.dateCreated?.seconds
    ? new Date(data.metadata.dateCreated.seconds * 1000)
        .toISOString()
        .split('T')[0]
    : 'unknown';
  console.log(`  Name: ${experimentName} (created ${dateCreated})`);

  // Check experiment does NOT exist in prod
  const prodExperimentRef = targetDb
    .collection('experiments')
    .doc(experimentId);
  const prodDoc = await prodExperimentRef.get();
  if (prodDoc.exists) {
    const error = `Experiment ${experimentId} already exists in prod database`;
    console.error(`  ERROR: ${error}. Aborting to avoid overwrite.`);
    return {experimentId, success: false, docCount: 0, error};
  }

  // Collect all documents recursively
  console.log(`  Reading from backup...`);
  const ops: WriteOp[] = [];
  await collectDocumentTree(backupExperimentRef, prodExperimentRef, ops);

  console.log(`  Found ${ops.length} documents to restore:`);
  summarizeOps(ops, experimentId);

  if (dryRun) {
    console.log(`  [DRY RUN] Would restore ${ops.length} documents.`);
    return {experimentId, success: true, docCount: ops.length};
  }

  // Write to prod using BulkWriter
  console.log(`  Writing to prod...`);
  const writeErrors: string[] = [];
  const writer = targetDb.bulkWriter();
  writer.onWriteError((err) => {
    writeErrors.push(`${err.documentRef.path}: ${err.message}`);
    return false; // stop retrying
  });
  for (const op of ops) {
    writer.set(op.ref, op.data);
  }
  await writer.close();

  if (writeErrors.length > 0) {
    console.error(`  ERROR: ${writeErrors.length} write(s) failed:`);
    for (const e of writeErrors) {
      console.error(`    ${e}`);
    }
    console.error(
      `  WARNING: Partial data may have been written to prod for experiment ${experimentId}.`,
    );
    const shouldCleanup = await confirm(
      `  Delete partially restored experiment ${experimentId} from prod? (y/N): `,
    );
    if (shouldCleanup) {
      console.log(`  Cleaning up partial restore...`);
      await targetDb.recursiveDelete(prodExperimentRef);
      console.log(`  Cleaned up.`);
    } else {
      console.log(`  Skipping cleanup. Partial data remains in prod.`);
    }
    return {
      experimentId,
      success: false,
      docCount: ops.length,
      error: `${writeErrors.length} write(s) failed`,
    };
  }

  console.log(`  Written ${ops.length} documents.`);

  // Verify: re-read the restored experiment tree and compare document count
  console.log(`  Verifying restore...`);
  const verifyDoc = await prodExperimentRef.get();
  if (!verifyDoc.exists) {
    const error =
      'Verification failed — experiment document not found after write';
    console.error(`  ERROR: ${error}`);
    return {experimentId, success: false, docCount: ops.length, error};
  }

  const verifyOps: WriteOp[] = [];
  await collectDocumentTree(prodExperimentRef, prodExperimentRef, verifyOps);
  if (verifyOps.length !== ops.length) {
    const error = `Verification failed — expected ${ops.length} documents but found ${verifyOps.length} in prod`;
    console.error(`  ERROR: ${error}`);
    return {experimentId, success: false, docCount: ops.length, error};
  }
  console.log(`  Verified: ${verifyOps.length} documents in prod.`);

  return {experimentId, success: true, docCount: ops.length};
}

async function main() {
  const {backupDb, prodDb, apply, experimentIds} = parseArgs();
  const dryRun = !apply;
  const projectId = process.env.GCLOUD_PROJECT || 'deliberate-lab';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Restore Experiments from Backup`);
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (no changes will be written)' : 'LIVE'}`,
  );
  console.log(`${'='.repeat(60)}`);
  console.log(`\nProject:         ${projectId}`);
  console.log(`Backup database: ${backupDb}`);
  console.log(`Prod database:   ${prodDb ?? '(default)'}`);
  console.log(`Experiments:     ${experimentIds.join(', ')}\n`);

  const confirmed = await confirm(
    `Proceed with ${dryRun ? 'dry run' : 'LIVE restore'}? (y/N): `,
  );
  if (!confirmed) {
    console.log('Aborted.');
    process.exit(0);
  }

  const sourceDb = getFirestore(backupDb);
  const targetDb = prodDb ? getFirestore(prodDb) : getFirestore();

  sourceDb.settings({ignoreUndefinedProperties: true});
  targetDb.settings({ignoreUndefinedProperties: true});

  const results: RestoreResult[] = [];

  for (const experimentId of experimentIds) {
    console.log(`\nRestoring experiment: ${experimentId}`);
    try {
      const result = await restoreExperiment(
        sourceDb,
        targetDb,
        experimentId,
        dryRun,
      );
      results.push(result);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${error}`);
      results.push({experimentId, success: false, docCount: 0, error});
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary`);
  console.log(`${'='.repeat(60)}`);

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalDocs = results.reduce((sum, r) => sum + r.docCount, 0);

  console.log(
    `Experiments: ${succeeded.length} succeeded, ${failed.length} failed`,
  );
  console.log(`Total documents: ${totalDocs}`);

  if (results.length > 0) {
    console.log('');
    for (const r of results) {
      const status = r.success ? 'OK' : `FAILED: ${r.error}`;
      console.log(`  [${r.experimentId}] ${r.docCount} docs — ${status}`);
    }
  }

  if (dryRun && succeeded.length > 0) {
    console.log(`\nRun with --apply to apply changes.`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main();
