import { pool } from '../../db/pool';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: Date;
  password_hash: string;
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
});

export async function findUserById(id: number): Promise<User | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

/** Also returns the password hash: only the login needs it. */
export async function findUserWithHashByEmail(
  email: string,
): Promise<{ user: User; passwordHash: string } | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ? { user: toUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function insertUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  const { rows } = await pool.query<UserRow>(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [input.name, input.email, input.passwordHash],
  );
  return toUser(rows[0]!);
}

export async function updateUserName(id: number, name: string): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    'UPDATE users SET name = $2 WHERE id = $1 RETURNING *',
    [id, name],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function countUserActivity(
  id: number,
): Promise<{ reviewCount: number; reportCount: number; favoriteCount: number; spotCount: number }> {
  const { rows } = await pool.query<{
    review_count: number;
    report_count: number;
    favorite_count: number;
    spot_count: number;
  }>(
    `SELECT (SELECT COUNT(*)::int FROM reviews      WHERE user_id = $1)    AS review_count,
            (SELECT COUNT(*)::int FROM live_reports WHERE user_id = $1)    AS report_count,
            (SELECT COUNT(*)::int FROM favorites    WHERE user_id = $1)    AS favorite_count,
            (SELECT COUNT(*)::int FROM spots        WHERE created_by = $1) AS spot_count`,
    [id],
  );
  const row = rows[0]!;
  return {
    reviewCount: row.review_count,
    reportCount: row.report_count,
    favoriteCount: row.favorite_count,
    spotCount: row.spot_count,
  };
}
