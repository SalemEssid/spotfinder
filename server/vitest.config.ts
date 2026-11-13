import { defineConfig } from 'vitest/config';

/**
 * Two groups of tests:
 * - unit: pure functions next to the code (src/**\/*.test.ts), no database needed.
 * - api:  HTTP routes with Supertest against a real PostgreSQL test database (test/**).
 */
export default defineConfig({
  test: {
    env: { NODE_ENV: 'test' },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'api',
          include: ['test/**/*.test.ts'],
          globalSetup: ['test/global-setup.ts'],
          // Route tests share one database: run the files one after the other.
          fileParallelism: false,
        },
      },
    ],
  },
});
