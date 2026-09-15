// site/vitest.config.ts
//
// Minimal Vitest config for the site workspace.
// Default node environment; ESM; TypeScript handled by Vitest's bundled esbuild.
// Test files live under `site/tests/` and follow the `*.test.ts` convention,
// mirroring the pipeline workspace.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
