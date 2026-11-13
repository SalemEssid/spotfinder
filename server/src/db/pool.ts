import pg from 'pg';
import { env } from '../config/env';

/** One shared connection pool for the whole API. */
export const pool = new pg.Pool({ connectionString: env.databaseUrl, max: 10 });

/**
 * Runs `fn` inside a transaction: COMMIT if it resolves, ROLLBACK if it throws.
 * Used whenever several statements must succeed or fail together.
 */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Anything that can run a query: the pool itself or a client inside a transaction. */
export type Queryable = Pick<pg.Pool, 'query'> | pg.PoolClient;
