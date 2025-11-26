const esbuild = require('esbuild');
const { dependencies } = require('./package.json');

// List of dependencies to bundle (local packages)
const BUNDLE_DEPS = ['@deliberation-lab/utils'];

// Create list of externals (everything else in dependencies)
const external = Object.keys(dependencies).filter(
  (dep) => !BUNDLE_DEPS.includes(dep)
);

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
