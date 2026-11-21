import { pool } from '../../db/pool';

/** Idempotent: adding an existing favourite does nothing. */
export async function addFavorite(userId: number, spotId: number): Promise<void> {
  await pool.query(
    'INSERT INTO favorites (user_id, spot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, spotId],
  );
}

/** Idempotent: removing a missing favourite does nothing. */
export async function removeFavorite(userId: number, spotId: number): Promise<void> {
  await pool.query('DELETE FROM favorites WHERE user_id = $1 AND spot_id = $2', [userId, spotId]);
}
