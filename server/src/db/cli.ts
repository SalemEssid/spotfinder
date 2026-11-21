/**
 * Database commands, run through npm scripts:
 *
 *   npm run db:prepare   → create the DB if needed, apply migrations, seed it if it is empty
 *                          (runs automatically before `npm run dev`)
 *   npm run db:migrate   → apply pending migrations only
 *   npm run db:reset     → wipe everything, re-create the schema and re-seed the demo data
 *   npm run demo:refresh → regenerate only the recent live reports (keeps users, reviews, favourites)
 */
import { env } from '../config/env';
import { dropSchema, ensureDatabaseExists, runMigrations } from './migrate';
import { pool, withTransaction } from './pool';
import { refreshRecentReports, seedDatabase } from './seed/seed';

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case 'prepare': {
      await ensureDatabaseExists(env.databaseUrl);
      await migrate();
      const { rows } = await pool.query<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM spots',
      );
      if (rows[0]!.count === 0) await seed();
      else console.log('✔ Database already contains data (use `npm run db:reset` to start over)');
      break;
    }
    case 'migrate':
      await migrate();
      break;
    case 'reset':
      await ensureDatabaseExists(env.databaseUrl);
      await dropSchema(pool);
      await migrate();
      await seed();
      break;
    case 'refresh': {
      const count = await withTransaction((client) => refreshRecentReports(client, new Date()));
      console.log(`✔ ${count} recent live reports regenerated`);
      break;
    }
    default:
      throw new Error(`Unknown command "${command}". Use prepare | migrate | reset | refresh.`);
  }
}

async function migrate(): Promise<void> {
  const applied = await runMigrations(pool);
  console.log(
    applied.length ? `✔ Migrations applied: ${applied.join(', ')}` : '✔ Schema up to date',
  );
}

async function seed(): Promise<void> {
  await withTransaction((client) => seedDatabase(client, new Date()));
  console.log('✔ Demo data inserted (account: demo@spotfinder.tn)');
}

/** Connection failures come as an AggregateError with an empty message but a `code`. */
function isConnectionError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT';
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (isConnectionError(error)) {
      console.error(
        `✖ Cannot reach PostgreSQL at ${new URL(env.databaseUrl).host}.\n` +
          '  Is Docker Desktop running? Try `npm run db:up`, or set DATABASE_URL in .env.',
      );
    } else {
      console.error('✖', message);
    }
    process.exitCode = 1;
  })
  .finally(() => pool.end());
