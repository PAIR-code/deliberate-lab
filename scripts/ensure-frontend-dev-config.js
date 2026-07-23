#!/usr/bin/env node

/**
 * ensure-frontend-dev-config.js — Make the frontend dev build self-sufficient.
 *
 * The frontend imports `frontend/firebase_config.ts` and html-webpack-plugin
 * needs `frontend/index.html`; neither is committed (both are gitignored,
 * generated files). run_locally.sh and the BuildDevFrontend step in
 * cloudbuild.yaml copy the committed *.example.* files before building.
 *
 * This mirrors that behavior for `npm run build` / `build:frontend`, copying an
 * example only when the target is MISSING so an operator's real files (or the
 * production config written by deploy-frontend.js) are preserved.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const files = [
  ['firebase_config.example.ts', 'firebase_config.ts'],
  ['index.example.html', 'index.html'],
];

for (const [example, target] of files) {
  const targetPath = path.join(FRONTEND_DIR, target);
  const examplePath = path.join(FRONTEND_DIR, example);
  if (fs.existsSync(targetPath)) {
    console.log(`\x1b[32m✓\x1b[0m frontend/${target} already exists`);
  } else if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, targetPath);
    console.log(`Copied frontend/${example} -> frontend/${target}`);
  } else {
    console.error(
      `\x1b[31m✗\x1b[0m frontend/${target} missing and no example (${example}) found`,
    );
    process.exit(1);
  }
}
