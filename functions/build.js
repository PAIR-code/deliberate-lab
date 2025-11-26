const esbuild = require('esbuild');
const { dependencies } = require('./package.json');

// Aggressive bundling: bundle everything except firebase-admin and firebase-functions.
// This is a common solution to support ESM-only packages (like uuid) in the
// Firebase Functions CommonJS runtime without migrating the entire project to ESM.
// Bundling with esbuild converts all dependencies into a single compatible CJS file.
// See: https://github.com/firebase/firebase-tools/issues/2994
const EXTERNAL_DEPS = ['firebase-admin', 'firebase-functions'];

// Create list of externals
const external = EXTERNAL_DEPS;

const isWatch = process.argv.includes('--watch');

const buildContext = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outdir: 'lib',
  external,
  logLevel: 'info',
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildContext);
    await ctx.watch();
  } else {
    await esbuild.build(buildContext);
  }
}

build().catch(() => process.exit(1));
