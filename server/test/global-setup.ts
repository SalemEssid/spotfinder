import pg from 'pg';
import { env } from '../src/config/env';
import { dropSchema, ensureDatabaseExists, runMigrations } from '../src/db/migrate';
import { seedDatabase } from '../src/db/seed/seed';

/**
 * Runs once before the API tests: rebuilds the *test* database from scratch
 * (never the development one) and fills it with the demo data.
 */
export default async function setup(): Promise<void> {
  await ensureDatabaseExists(env.TEST_DATABASE_URL);
  const pool = new pg.Pool({ connectionString: env.TEST_DATABASE_URL });
  try {
    await dropSchema(pool);
    await runMigrations(pool);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await seedDatabase(client, new Date());
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
