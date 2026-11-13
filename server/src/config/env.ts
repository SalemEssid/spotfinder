import path from 'node:path';
import { z } from 'zod';

// Load the root `.env` file if it exists (built into Node ≥ 21, no `dotenv` needed).
// Without it, the development defaults below are used, so `npm run dev` works out of the box.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'));
} catch {
  // No .env file: fine in development.
}

const DEV_JWT_SECRET = 'dev-only-secret-not-for-production';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    // Docker Compose exposes PostgreSQL on 5433 to avoid clashing with a local install on 5432.
    DATABASE_URL: z.string().default('postgres://spotfinder:spotfinder@localhost:5433/spotfinder'),
    TEST_DATABASE_URL: z
      .string()
      .default('postgres://spotfinder:spotfinder@localhost:5433/spotfinder_test'),
    JWT_SECRET: z.string().min(16).default(DEV_JWT_SECRET),
    CLIENT_ORIGIN: z.string().default('http://localhost:4200'),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.JWT_SECRET !== DEV_JWT_SECRET, {
    message: 'JWT_SECRET must be set in production',
  });

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  isProduction: parsed.NODE_ENV === 'production',
  isTest: parsed.NODE_ENV === 'test',
  /** Tests always run against a separate database so they never touch demo data. */
  databaseUrl: parsed.NODE_ENV === 'test' ? parsed.TEST_DATABASE_URL : parsed.DATABASE_URL,
};
