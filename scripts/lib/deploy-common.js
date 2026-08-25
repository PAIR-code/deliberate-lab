/**
 * deploy-common.js — Shared helpers for the local deploy pipeline.
 *
 * Local companion to cloudbuild.yaml. See issue #1197 and
 * <repo>/scripts/AGENTS.md for the design. These are plain-Node (CommonJS)
 * operational scripts following the scripts/doctor.js idiom.
 *
 * Cross-cutting configuration is read from environment variables (npm forwards
 * `-- <args>` only to the last command in a chain, so flags can't propagate):
 *
 *   PROJECT_ID            (required) Target GCP project. No fallback.
 *   DRY_RUN               If set, run dry-run equivalents instead of real deploys.
 *   YES                   If set, skip the interactive typed confirmation.
 *   AUTO_PROMOTE          Frontend: migrate traffic (drop --no-promote).
 *   FIREBASE_CONFIG_FILE  Path to a JSON web-config override file.
 */

const path = require('path');
const readline = require('readline');
const {spawn, spawnSync} = require('child_process');

// Repo root: scripts/lib/ -> scripts/ -> <root>
const ROOT = path.join(__dirname, '..', '..');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

/** Write a line to stderr (used for human-facing messages that must NOT be
 * captured by `$(...)` command substitution). */
function note(msg = '') {
  process.stderr.write(msg + '\n');
}

/** Print a progress line to stdout. */
function log(msg = '') {
  process.stdout.write(msg + '\n');
}

/** Return PROJECT_ID or exit(1) with actionable guidance. Never falls back to
 * .firebaserc or `gcloud config` (Decision 1: explicit target every time). */
function assertProjectId() {
  const id = process.env.PROJECT_ID;
  if (!id || !id.trim()) {
    note(colors.red('✗ PROJECT_ID is required.'));
    note('  This tooling never guesses the target project (safety).');
    note('  Example:');
    note('    PROJECT_ID=my-project npm run deploy:functions');
    process.exit(1);
  }
  return id.trim();
}

/** True when DRY_RUN is set to any non-empty value. */
function isDryRun() {
  return Boolean(process.env.DRY_RUN && process.env.DRY_RUN !== '');
}

/** True when YES is set to any non-empty value. */
function skipConfirm() {
  return Boolean(process.env.YES && process.env.YES !== '');
}

/** Verify required CLIs are available; fail fast with guidance otherwise.
 * `firebase` is checked via the local devDependency (npx --no-install). */
function checkClis(names) {
  const missing = [];
  for (const name of names) {
    if (name === 'firebase') {
      const r = spawnSync(
        'npx',
        ['--no-install', 'firebase', '--version'],
        {stdio: 'ignore', cwd: ROOT},
      );
      if (r.status !== 0) {
        missing.push({
          name: 'firebase',
          hint: 'Run `npm ci` (firebase-tools is a devDependency), then `npx firebase login`.',
        });
      }
    } else {
      const which = process.platform === 'win32' ? 'where' : 'which';
      const r = spawnSync(which, [name], {stdio: 'ignore'});
      if (r.status !== 0) {
        const hint =
          name === 'gcloud'
            ? 'Install the Google Cloud SDK and run `gcloud auth login`.'
            : `Install '${name}' and ensure it is on your PATH.`;
        missing.push({name, hint});
      }
    }
  }
  if (missing.length) {
    note(colors.red('✗ Missing required command(s):'));
    for (const m of missing) {
      note(`  - ${m.name}: ${m.hint}`);
    }
    process.exit(1);
  }
}

/** Interactive typed confirmation. Skipped when YES is set. Requires the
 * operator to type the exact PROJECT_ID. All prompt text goes to stderr. */
function confirm({surface, project, extra}) {
  if (skipConfirm()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    note('');
    note(colors.bold('⚠  You are about to DEPLOY to a real GCP project.'));
    note(`   Project: ${colors.bold(project)}`);
    note(`   Surface: ${surface}`);
    if (extra) note(`   ${extra}`);
    note('');
    rl.question(
      `Type the project id (${project}) to proceed: `,
      (answer) => {
        rl.close();
        if (answer.trim() === project) {
          resolve();
        } else {
          note(colors.red('✗ Confirmation did not match. Aborting.'));
          process.exit(1);
        }
      },
    );
  });
}

/** Run a command with inherited stdio (live output straight to the terminal).
 * Returns a promise that resolves on exit code 0 and rejects otherwise. */
function run(cmd, args, {cwd, env} = {}) {
  return new Promise((resolve, reject) => {
    process.stdout.write(colors.dim(`$ ${cmd} ${args.join(' ')}`) + '\n');
    const child = spawn(cmd, args, {
      cwd: cwd || ROOT,
      env: {...process.env, ...(env || {})},
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(0)
        : reject(new Error(`${cmd} exited with code ${code}`)),
    );
  });
}

/** Convenience: invoke the local firebase-tools CLI via npx --no-install. */
function firebase(args, opts) {
  return run('npx', ['--no-install', 'firebase', ...args], opts);
}

/** Standard preamble for a single-surface deploy helper. Asserts PROJECT_ID,
 * checks CLIs, prints a header, and (unless YES) confirms. */
async function beginSurface({surface, extra, clis = ['firebase', 'gcloud']}) {
  const project = assertProjectId();
  checkClis(clis);
  log(colors.bold(`\n=== Deploy: ${surface} ===`));
  log(`Project:   ${project}`);
  log(`Mode:      ${isDryRun() ? 'DRY RUN (no writes)' : 'REAL DEPLOY'}`);
  await confirm({surface, project, extra});
  return {project};
}

module.exports = {
  ROOT,
  colors,
  note,
  log,
  assertProjectId,
  isDryRun,
  skipConfirm,
  checkClis,
  confirm,
  run,
  firebase,
  beginSurface,
};
