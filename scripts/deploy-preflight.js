#!/usr/bin/env node

/**
 * deploy-preflight.js — Up-front gate for `npm run deploy:all`.
 *
 * Runs BEFORE the long lint/build/test pipeline so blockers surface in seconds
 * instead of after several minutes of work:
 *   1. Assert PROJECT_ID and required CLIs.
 *   2. Reconcile the frontend web config (validate it + detect a conflicting
 *      existing frontend/firebase_config.ts) WITHOUT mutating the working tree.
 *      deploy-frontend.js performs the real write later in the pipeline.
 *   3. Perform the SINGLE typed confirmation for the whole pipeline.
 *
 * All human-facing text is written to stderr. Any failure (unresolvable/invalid
 * config, a conflicting real config, or a declined confirmation) exits non-zero,
 * aborting the && chain in `deploy:all`.
 */

const {
  assertProjectId,
  checkClis,
  isDryRun,
  confirm,
  note,
  colors,
} = require('./lib/deploy-common');
const {reconcileConfig} = require('./lib/frontend-config');

async function main() {
  const project = assertProjectId();
  checkClis(['firebase', 'gcloud']);

  // Preview-only: never writes, but a conflicting real config fails loudly here.
  note(colors.bold('\n=== Preflight: frontend web config ==='));
  reconcileConfig({project, write: false, log: note});

  await confirm({
    project,
    surface: 'ALL surfaces (rules → indexes → functions → frontend)',
    extra: isDryRun() ? 'DRY RUN (no writes to GCP)' : 'REAL DEPLOY',
  });
}

main().catch((err) => {
  const text = err && err.userFacing ? err.message : String(err && err.stack ? err.stack : err);
  process.stderr.write(colors.red(text) + '\n');
  process.exit(1);
});
