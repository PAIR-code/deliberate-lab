#!/usr/bin/env node

/**
 * Health check script for Deliberate Lab development environment.
 * Run with: npm run doctor
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

let hasErrors = false;
let hasWarnings = false;

function success(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function warning(msg) {
  console.log(`\x1b[33m!\x1b[0m ${msg}`);
  hasWarnings = true;
}

function error(msg) {
  console.log(`\x1b[31m✗\x1b[0m ${msg}`);
  hasErrors = true;
}

function header(msg) {
  console.log(`\n\x1b[1m${msg}\x1b[0m`);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

function fixNodeModules() {
  const dirs = [
    path.join(ROOT, 'node_modules'),
    path.join(ROOT, 'frontend', 'node_modules'),
    path.join(ROOT, 'functions', 'node_modules'),
    path.join(ROOT, 'utils', 'node_modules'),
  ];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      console.log(`Deleting ${path.relative(ROOT, dir)}...`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('Clearing npm cache...');
  execSync('npm cache clean --force', { stdio: 'inherit' });

  console.log('\nRunning npm ci...');
  execSync('npm ci', { stdio: 'inherit', cwd: ROOT });
}

async function main() {
  // Check Node version
  header('Checking Node.js version...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 22) {
    success(`Node.js ${nodeVersion} (>= 22 required)`);
  } else {
    error(`Node.js ${nodeVersion} - version 22 or higher required`);
    console.log('  Run: nvm install 22 && nvm use 22');
  }

  // Check if running from root directory
  header('Checking working directory...');
  const cwd = process.cwd();
  if (cwd === ROOT) {
    success('Running from repository root');
  } else {
    warning(`Running from ${cwd}`);
    console.log(`  Expected: ${ROOT}`);
  }

  // Check for node_modules
  header('Checking dependencies...');
  const rootNodeModules = path.join(ROOT, 'node_modules');
  if (fs.existsSync(rootNodeModules)) {
    success('Root node_modules exists');
  } else {
    error('Root node_modules missing');
    console.log('  Run: npm ci');
  }

  // Check for required config files
  header('Checking configuration files...');

  const configFiles = [
    {
      path: '.firebaserc',
      example: '.firebaserc.example',
    },
    {
      path: 'frontend/firebase_config.ts',
      example: 'frontend/firebase_config.example.ts',
    },
    {
      path: 'frontend/index.html',
      example: 'frontend/index.example.html',
    },
  ];

  for (const { path: filePath, example } of configFiles) {
    const fullPath = path.join(ROOT, filePath);
    const examplePath = path.join(ROOT, example);
    if (fs.existsSync(fullPath)) {
      success(filePath);
    } else if (fs.existsSync(examplePath)) {
      warning(`${filePath} missing`);
      console.log(`  Run: cp ${example} ${filePath}`);
    } else {
      warning(`${filePath} missing (no example found)`);
    }
  }

  // Check for utils build
  header('Checking builds...');
  const utilsDist = path.join(ROOT, 'utils', 'dist');
  if (fs.existsSync(utilsDist)) {
    success('utils/dist exists');
  } else {
    warning('utils/dist missing');
    console.log('  Run: npm run build -w utils');
  }

  const functionsLib = path.join(ROOT, 'functions', 'lib');
  if (fs.existsSync(functionsLib)) {
    success('functions/lib exists');
  } else {
    warning('functions/lib missing');
    console.log('  Run: npm run build -w functions');
  }

  // Summary
  header('Summary');
  if (hasErrors) {
    console.log('\x1b[31mThere are errors that must be fixed.\x1b[0m\n');

    const answer = await prompt(
      'Would you like to fix this by reinstalling dependencies? (y/n) '
    );
    if (answer === 'y' || answer === 'yes') {
      console.log('');
      fixNodeModules();
      console.log('\n\x1b[32mDone!\x1b[0m\n');
    }

    process.exit(1);
  } else if (hasWarnings) {
    console.log('\x1b[33mThere are warnings you may want to address.\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\x1b[32mEverything looks good!\x1b[0m\n');
    process.exit(0);
  }
}

main();
