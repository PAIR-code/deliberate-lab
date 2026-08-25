#!/usr/bin/env node

/**
 * deploy-indexes.js — Deploy Firestore indexes.
 *
 * Local companion to the DeployFirebaseIndexes step in cloudbuild.yaml.
 * Rollback: indexes change rarely; prior definitions live in git history
 * (firestore/indexes.json) and Cloud Build logs. Redeploy an earlier commit.
 */

const {
  isDryRun,
  firebase,
  beginSurface,
  colors,
  log,
} = require('./lib/deploy-common');

async function main() {
  const {project} = await beginSurface({
    surface: 'Firestore indexes',
    clis: ['firebase'],
  });

  const args = [
    'deploy',
    '--only',
    'firestore:indexes',
    '--project',
    project,
    '--non-interactive',
    isDryRun() ? '--dry-run' : '--force',
  ];
  log(
    isDryRun()
      ? 'Dry-run: deploying Firestore indexes...'
      : 'Deploying Firestore indexes...',
  );
  await firebase(args);
  log(colors.green('✓ Firestore indexes step complete.'));
}

main().catch((err) => {
  process.stderr.write(colors.red(String(err && err.stack ? err.stack : err)) + '\n');
  process.exit(1);
});
