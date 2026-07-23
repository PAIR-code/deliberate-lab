#!/usr/bin/env node

/**
 * deploy-database-rules.js — Deploy Realtime Database security rules.
 *
 * Local companion to the DeployFirebaseDatabaseRules step in cloudbuild.yaml.
 * Rollback: redeploy an earlier commit (RTDB rules are defined in
 * firestore/database.rules.json).
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
    surface: 'Realtime Database rules',
    clis: ['firebase'],
  });

  const args = [
    'deploy',
    '--only',
    'database:rules',
    '--project',
    project,
    '--non-interactive',
    isDryRun() ? '--dry-run' : '--force',
  ];
  log(
    isDryRun()
      ? 'Dry-run: deploying Database rules...'
      : 'Deploying Database rules...',
  );
  await firebase(args);
  log(colors.green('✓ Database rules step complete.'));
}

main().catch((err) => {
  process.stderr.write(colors.red(String(err && err.stack ? err.stack : err)) + '\n');
  process.exit(1);
});
