#!/usr/bin/env node

/**
 * deploy-functions.js — Deploy Cloud Functions.
 *
 * Local companion to the DeployFirebaseFunctions step in cloudbuild.yaml.
 *
 * Unlike CI (which strips predeploy into firebase-prod.json), this path keeps
 * firebase.json as-is, so `firebase deploy --only functions` runs the
 * functions predeploy hooks (lint + build) automatically. We build `utils`
 * first because functions depend on utils/dist (AGENTS.md "utils first" rule).
 *
 * No live backup is taken (there is no simple "prior definition" to snapshot);
 * rollback is a redeploy of prior source. This matches CI behavior.
 */

const {
  isDryRun,
  run,
  firebase,
  beginSurface,
  colors,
  log,
} = require('./lib/deploy-common');

async function main() {
  const {project} = await beginSurface({
    surface: 'Cloud Functions',
    clis: ['firebase'],
  });

  log('Building utils (functions depend on utils/dist)...');
  await run('npm', ['run', 'build:utils']);

  const args = [
    'deploy',
    '--only',
    'functions',
    '--project',
    project,
    '--non-interactive',
    isDryRun() ? '--dry-run' : '--force',
  ];
  log(
    isDryRun()
      ? 'Dry-run: deploying Functions (predeploy runs lint + build)...'
      : 'Deploying Functions (predeploy runs lint + build)...',
  );
  await firebase(args);
  log(colors.green('✓ Functions step complete.'));
}

main().catch((err) => {
  process.stderr.write(colors.red(String(err && err.stack ? err.stack : err)) + '\n');
  process.exit(1);
});
