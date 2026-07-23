/**
 * frontend-config.js — Resolve, validate, and reconcile frontend/firebase_config.ts.
 *
 * The Firebase web config is NOT a secret (it ships in the client bundle;
 * security is enforced by Rules + App Check). But it MUST be correct for the
 * target project, so this module produces it and is run as an EARLY preflight
 * (see deploy-preflight.js) so a bad config blocks `deploy:all` before the long
 * lint/build/test pipeline.
 *
 * Authoritative sources (precedence):
 *   1. FIREBASE_CONFIG_FILE — a JSON file with the FirebaseOptions object.
 *   2. Auto-fetch — `firebase apps:sdkconfig WEB --project <id> --json`.
 *
 * Reconciliation against an existing frontend/firebase_config.ts:
 *   - missing                       → write the authoritative config (or, in
 *                                     preview/dry-run mode, report it would be).
 *   - matches the authoritative one → nothing to do.
 *   - equals the committed demo example (the dev-build sentinel written by
 *     ensure-frontend-dev-config.js) → treated as absent and replaced.
 *   - otherwise (a real, DIFFERENT config) → FAIL LOUDLY. The file is gitignored
 *     and may be the operator's own, so we never silently overwrite it; they
 *     must delete it (to regenerate) or correct it to match.
 *
 * Validation mirrors cloudbuild.yaml's frontend validation step: every
 * REQUIRED_FIELD must be present as a non-empty string, and projectId must equal
 * the target PROJECT_ID.
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {colors} = require('./deploy-common');

const ROOT = path.join(__dirname, '..', '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const CONFIG_TS = path.join(FRONTEND_DIR, 'firebase_config.ts');
const CONFIG_EXAMPLE = path.join(FRONTEND_DIR, 'firebase_config.example.ts');

// Mirrors the required-field check in cloudbuild.yaml's validation step.
const REQUIRED_FIELDS = [
  'apiKey',
  'appId',
  'authDomain',
  'measurementId',
  'messagingSenderId',
  'projectId',
  'storageBucket',
];

// Optional fields we compare when present (never required).
const OPTIONAL_FIELDS = ['databaseURL'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

/** A blocking, user-facing error (clean message, no stack trace for callers). */
function blockingError(msg) {
  const err = new Error(msg);
  err.userFacing = true;
  return err;
}

/** Render a firebase_config.ts file from a config object (repo format).
 *
 * Emits the repo's Prettier style (bare keys, single-quoted values, trailing
 * comma, 2-space indent) so the generated file passes `prettier --check` — the
 * deploy `lint` step globs frontend/**\/*.ts and Prettier does NOT honor
 * .gitignore, so this gitignored file would otherwise be flagged. Firebase web
 * config values (api keys, domains, ids, urls) never contain quotes, so simple
 * single-quoting is safe and matches firebase_config.example.ts. */
function renderConfigTs(config) {
  const body = Object.entries(config)
    .map(([key, value]) => `  ${key}: '${String(value)}',`)
    .join('\n');
  return (
    "import {FirebaseOptions} from 'firebase/app';\n\n" +
    `export const FIREBASE_CONFIG: FirebaseOptions = {\n${body}\n};\n`
  );
}

/** Read a single string field from a firebase_config.ts via a simple regex.
 * Handles both quoted keys ("projectId", as JSON.stringify emits) and bare keys
 * (projectId, as the committed example uses); the value may be single/double
 * quoted. */
function readField(contents, key) {
  const m = contents.match(
    new RegExp(`["']?${key}["']?\\s*:\\s*['"]([^'"]+)['"]`),
  );
  return m ? m[1] : undefined;
}

/** Parse the known FirebaseOptions fields out of a firebase_config.ts. */
function parseConfigTs(contents) {
  const obj = {};
  for (const key of ALL_FIELDS) {
    const v = readField(contents, key);
    if (v !== undefined) obj[key] = v;
  }
  return obj;
}

/** Keep only valid FirebaseOptions fields. `apps:sdkconfig` (and possibly a
 * user-supplied override file) can include extras like projectNumber/version
 * that are NOT part of FirebaseOptions and break the frontend TypeScript build
 * (TS2353). We normalize to the allowlist before writing/validating. */
function pickKnownFields(config) {
  const clean = {};
  if (config && typeof config === 'object') {
    for (const key of ALL_FIELDS) {
      if (config[key] !== undefined) clean[key] = config[key];
    }
  }
  return clean;
}

/** Validate a config object against the target project. Throws on failure. */
function validateConfig(config, project, sourceLabel) {
  if (!config || typeof config !== 'object') {
    throw blockingError(`${sourceLabel}: config is not an object.`);
  }
  const missing = REQUIRED_FIELDS.filter(
    (f) => !config[f] || typeof config[f] !== 'string',
  );
  if (missing.length) {
    let msg = `${sourceLabel}: missing/invalid required field(s): ${missing.join(', ')}.`;
    if (missing.includes('measurementId')) {
      msg +=
        '\n  measurementId comes from a linked Google Analytics stream. Link GA to ' +
        'the\n  Firebase web app, or supply a complete config via FIREBASE_CONFIG_FILE.';
    }
    throw blockingError(msg);
  }
  if (config.projectId !== project) {
    throw blockingError(
      `${sourceLabel}: projectId '${config.projectId}' does not match ` +
        `target PROJECT_ID '${project}'.`,
    );
  }
}

/** Auto-fetch the web SDK config from the target project. */
function autoFetchConfig(project) {
  const out = execSync(
    `npx --no-install firebase apps:sdkconfig WEB --project ${project} --json`,
    {cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe']},
  );
  const parsed = JSON.parse(out);
  // Firebase CLI --json shape: { status, result: { sdkConfig: {...} } }
  return (
    (parsed.result && parsed.result.sdkConfig) ||
    parsed.sdkConfig ||
    parsed.result ||
    parsed
  );
}

/** Produce the authoritative, validated config from file or auto-fetch. */
function resolveAuthoritative(project, log) {
  if (process.env.FIREBASE_CONFIG_FILE) {
    const file = process.env.FIREBASE_CONFIG_FILE;
    log(`Web config: using FIREBASE_CONFIG_FILE (${file}).`);
    const config = pickKnownFields(JSON.parse(fs.readFileSync(file, 'utf-8')));
    validateConfig(config, project, `FIREBASE_CONFIG_FILE (${file})`);
    return {source: 'FIREBASE_CONFIG_FILE', config};
  }
  log(`Web config: auto-fetching from project '${project}'...`);
  const config = pickKnownFields(autoFetchConfig(project));
  validateConfig(config, project, `auto-fetch (apps:sdkconfig for '${project}')`);
  return {source: 'auto-fetch', config};
}

/** True when the existing file is the committed demo example verbatim (i.e. the
 * sentinel ensure-frontend-dev-config.js writes to satisfy the dev build). */
function existingIsDemoSentinel(existingContents) {
  if (!fs.existsSync(CONFIG_EXAMPLE)) return false;
  return existingContents.trim() === fs.readFileSync(CONFIG_EXAMPLE, 'utf-8').trim();
}

/** Fields present in the existing file whose value CONFLICTS with authoritative
 * (a genuinely different value the operator may have set on purpose). Absent
 * fields are not conflicts — they just mean the file is incomplete/stale. */
function conflictingFields(authoritative, existingObj) {
  return ALL_FIELDS.filter(
    (f) => existingObj[f] !== undefined && existingObj[f] !== authoritative[f],
  );
}

/** Human-readable field-level diff for the loud-failure message. */
function describeDiff(authoritative, existingObj, fields = ALL_FIELDS) {
  const lines = [];
  for (const f of fields) {
    if (authoritative[f] !== existingObj[f]) {
      lines.push(
        `    - ${f}: existing '${existingObj[f] ?? '(absent)'}' != ` +
          `expected '${authoritative[f] ?? '(absent)'}'`,
      );
    }
  }
  return lines.join('\n');
}

function writeOrPreview(config, write, log) {
  if (write) {
    fs.writeFileSync(CONFIG_TS, renderConfigTs(config));
    log(colors.green('  ✓ Wrote frontend/firebase_config.ts'));
    return 'wrote';
  }
  log(colors.dim('  (preview) would write frontend/firebase_config.ts'));
  return 'would-write';
}

/**
 * Reconcile frontend/firebase_config.ts with the authoritative config.
 *
 * @param {{project: string, write: boolean, log: Function}} opts - when `write`
 *   is false (preview/dry-run) the working tree is never mutated, but a
 *   conflicting real config still fails loudly.
 * @returns {{source, config, projectId, measurementId, action}}
 */
function reconcileConfig({project, write, log}) {
  const {source, config} = resolveAuthoritative(project, log);

  let action;
  if (fs.existsSync(CONFIG_TS)) {
    const existingContents = fs.readFileSync(CONFIG_TS, 'utf-8');

    if (existingIsDemoSentinel(existingContents)) {
      log(
        'Web config: existing frontend/firebase_config.ts is the dev demo ' +
          'placeholder; it will be replaced.',
      );
      action = writeOrPreview(config, write, log);
    } else {
      const existingObj = parseConfigTs(existingContents);
      const conflicts = conflictingFields(config, existingObj);
      if (conflicts.length) {
        throw blockingError(
          `frontend/firebase_config.ts already exists and DIFFERS from the ` +
            `authoritative config for '${project}':\n` +
            describeDiff(config, existingObj, conflicts) +
            `\n  This file is gitignored and may be intentional, so it will NOT be ` +
            `overwritten automatically.\n  Resolve it by deleting the file (to let ` +
            `the deploy regenerate it) or correcting it to match, then re-run.`,
        );
      } else if (existingContents.trim() === renderConfigTs(config).trim()) {
        log(
          colors.green(
            '  ✓ Existing frontend/firebase_config.ts matches the authoritative config.',
          ),
        );
        action = 'matches';
      } else {
        // Same known values, but the file isn't normalized (e.g. stale extra
        // fields like projectNumber/version, or different formatting/key order).
        // Safe to regenerate: no known field conflicts, so no operator intent
        // is lost, and this repairs a config that would fail the TS build.
        log(
          'Web config: existing frontend/firebase_config.ts has matching values ' +
            'but is not normalized; regenerating.',
        );
        action = writeOrPreview(config, write, log);
      }
    }
  } else {
    action = writeOrPreview(config, write, log);
  }

  return {
    source,
    config,
    projectId: config.projectId,
    measurementId: config.measurementId,
    action,
  };
}

module.exports = {
  FRONTEND_DIR,
  CONFIG_TS,
  REQUIRED_FIELDS,
  renderConfigTs,
  parseConfigTs,
  validateConfig,
  autoFetchConfig,
  resolveAuthoritative,
  reconcileConfig,
};
