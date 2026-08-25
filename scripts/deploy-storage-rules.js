#!/usr/bin/env node

/**
 * deploy-storage-rules.js — Deploy Cloud Storage security rules.
 *
 * Local companion to the DeployFirebaseStorageRules step in cloudbuild.yaml.
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
    surface: 'Storage rules',
    clis: ['firebase'],
  });

  const args = [
    'deploy',
    '--only',
    'storage',
    '--project',
    project,
    '--non-interactive',
    isDryRun() ? '--dry-run' : '--force',
  ];
  log(
    isDryRun()
      ? 'Dry-run: deploying Storage rules...'
      : 'Deploying Storage rules...',
  );
  await firebase(args);
  log(colors.green('✓ Storage rules step complete.'));
}

main().catch((err) => {
  process.stderr.write(colors.red(String(err && err.stack ? err.stack : err)) + '\n');
  process.exit(1);
});
