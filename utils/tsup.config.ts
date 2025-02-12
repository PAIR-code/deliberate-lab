/**
 * Tsup compilation config. Produce both esm and cjs outputs.
 */

import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Specify both cjs and esm formats
  dts: true, // Generate TypeScript declaration files
  sourcemap: true, // Generate source maps
  clean: true, // Clean the output directory before each build
});
