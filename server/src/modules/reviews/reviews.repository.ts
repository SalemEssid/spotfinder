import { pool } from '../../db/pool';

interface ReviewRow {
  id: number;
  spot_id: number;
  spot_name: string;
  user_id: number;
  author_name: string;
  rating_wifi: number;
  rating_calm: number;
  rating_outlets: number;
  rating_price: number;
  comment: string;
  created_at: Date;
  updated_at: Date | null;
}

export interface ReviewDto {
  id: number;
  spot: { id: number; name: string };
  author: { id: number; name: string };
  ratings: { wifi: number; calm: number; outlets: number; price: number };
  comment: string;
  createdAt: string;
  /** Date of the last edit, null if the review was never edited. */
  updatedAt: string | null;
}

/** What a member fills in, both to create and to edit a review. */
export interface ReviewInput {
  ratingWifi: number;
  ratingCalm: number;
  ratingOutlets: number;
  ratingPrice: number;
  comment: string;
}

const REVIEW_SELECT = `
  SELECT r.*, s.name AS spot_name, u.name AS author_name
  FROM reviews r
  JOIN spots s ON s.id = r.spot_id
  JOIN users u ON u.id = r.user_id`;

const toDto = (row: ReviewRow): ReviewDto => ({
  id: row.id,
  spot: { id: row.spot_id, name: row.spot_name },
  author: { id: row.user_id, name: row.author_name },
  ratings: { wifi: row.rating_wifi, calm: row.rating_calm, outlets: row.rating_outlets, price: row.rating_price },
  comment: row.comment,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at?.toISOString() ?? null,
});

export async function findReviewsOfSpot(spotId: number): Promise<ReviewDto[]> {
  const { rows } = await pool.query<ReviewRow>(`${REVIEW_SELECT} WHERE r.spot_id = $1 ORDER BY r.created_at DESC`, [
    spotId,
  ]);
  return rows.map(toDto);
}

export async function findReviewsOfUser(userId: number): Promise<ReviewDto[]> {
  const { rows } = await pool.query<ReviewRow>(`${REVIEW_SELECT} WHERE r.user_id = $1 ORDER BY r.created_at DESC`, [
    userId,
  ]);
  return rows.map(toDto);
}

export async function findReviewById(id: number): Promise<ReviewDto | null> {
  const { rows } = await pool.query<ReviewRow>(`${REVIEW_SELECT} WHERE r.id = $1`, [id]);
  return rows[0] ? toDto(rows[0]) : null;
}

export async function insertReview(input: ReviewInput & { spotId: number; userId: number }): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO reviews (spot_id, user_id, rating_wifi, rating_calm, rating_outlets, rating_price, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [input.spotId, input.userId, input.ratingWifi, input.ratingCalm, input.ratingOutlets, input.ratingPrice, input.comment],
  );
  return rows[0]!.id;
}

/** Replaces the ratings and comment of a review and records when it was edited. */
export async function updateReview(id: number, input: ReviewInput): Promise<void> {
  await pool.query(
    `UPDATE reviews
     SET rating_wifi = $2, rating_calm = $3, rating_outlets = $4, rating_price = $5, comment = $6, updated_at = now()
     WHERE id = $1`,
    [id, input.ratingWifi, input.ratingCalm, input.ratingOutlets, input.ratingPrice, input.comment],
  );
}

export async function deleteReview(id: number): Promise<void> {
  await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
}
