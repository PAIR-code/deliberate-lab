#!/usr/bin/env node

/**
 * deploy-firestore-rules.js — Deploy Firestore security rules.
 *
 * Local companion to the DeployFirebaseFirestoreRules step in cloudbuild.yaml.
 * Rollback: Firebase retains rules version history (restore via the console),
 * or redeploy an earlier commit.
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
    surface: 'Firestore rules',
    clis: ['firebase'],
  });

  const args = [
    'deploy',
    '--only',
    'firestore:rules',
    '--project',
    project,
    '--non-interactive',
    isDryRun() ? '--dry-run' : '--force',
  ];
  log(
    isDryRun()
      ? 'Dry-run: deploying Firestore rules...'
      : 'Deploying Firestore rules...',
  );
  await firebase(args);
  log(colors.green('✓ Firestore rules step complete.'));
}

main().catch((err) => {
  process.stderr.write(colors.red(String(err && err.stack ? err.stack : err)) + '\n');
  process.exit(1);
});
