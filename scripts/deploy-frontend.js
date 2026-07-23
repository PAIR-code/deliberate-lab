#!/usr/bin/env node

/**
 * deploy-frontend.js — Build the production frontend and deploy to App Engine.
 *
 * Local companion to the BuildProdFrontend + DeployFrontend steps in
 * cloudbuild.yaml.
 *
 * The Firebase web config (frontend/firebase_config.ts) is resolved, validated,
 * and reconciled by scripts/lib/frontend-config.js (shared with the deploy:all
 * preflight): it is written from FIREBASE_CONFIG_FILE or auto-fetch, an existing
 * matching file is reused as-is, and a conflicting real config fails loudly. The
 * config is NOT a secret (it ships in the client bundle; security is enforced by
 * Rules + App Check). measurementId is passed to Webpack via MEASUREMENT_ID (see
 * frontend/webpack.config.mts). App Engine deploy uses --no-promote unless
 * AUTO_PROMOTE is set. DRY_RUN validates/reconciles the config (without writing
 * or building) and verifies App Engine state.
 */

const fs = require('fs');
const path = require('path');
const {
  isDryRun,
  run,
  beginSurface,
  colors,
  log,
  ROOT,
} = require('./lib/deploy-common');
const {reconcileConfig} = require('./lib/frontend-config');

const FRONTEND_DIR = path.join(ROOT, 'frontend');
const INDEX_EXAMPLE = path.join(FRONTEND_DIR, 'index.example.html');
const INDEX_HTML = path.join(FRONTEND_DIR, 'index.html');

async function main() {
  const promote =
    Boolean(process.env.AUTO_PROMOTE && process.env.AUTO_PROMOTE !== '');
  const {project} = await beginSurface({
    surface: 'Frontend (App Engine)',
    extra: promote
      ? 'Auto-promote: traffic WILL migrate to the new version'
      : 'Auto-promote: OFF (deploys with --no-promote)',
  });

  // Resolve + validate + write the authoritative web config (or reuse a matching
  // existing file; a conflicting real config fails loudly). No writes on dry-run.
  const {source, projectId, measurementId} = reconcileConfig({
    project,
    write: !isDryRun(),
    log,
  });
  log(`Resolved web config projectId: ${projectId} (source: ${source}).`);

  if (isDryRun()) {
    log('Dry-run: verifying App Engine state instead of deploying...');
    await run('gcloud', ['app', 'describe', '--project', project]);
    log(
      colors.green(`✓ Frontend dry-run complete (config source: ${source}).`),
    );
    return;
  }

  log('Copying index.example.html -> index.html...');
  fs.copyFileSync(INDEX_EXAMPLE, INDEX_HTML);

  log('Building production frontend (build:prod)...');
  await run('npm', ['run', 'build:prod', '-w', 'frontend'], {
    env: measurementId ? {MEASUREMENT_ID: measurementId} : {},
  });

  const deployArgs = [
    'app',
    'deploy',
    'app.yaml',
    '--project',
    project,
    '--quiet',
  ];
  if (!promote) {
    deployArgs.push('--no-promote');
  }
  log(
    promote
      ? 'Deploying frontend to App Engine (auto-promote)...'
      : 'Deploying frontend to App Engine (--no-promote)...',
  );
  await run('gcloud', deployArgs, {
    cwd: FRONTEND_DIR,
  });
  log(colors.green(`✓ Frontend step complete (config source: ${source}).`));
}

main().catch((err) => {
  const text = err && err.userFacing ? err.message : String(err && err.stack ? err.stack : err);
  process.stderr.write(colors.red(text) + '\n');
  process.exit(1);
});
