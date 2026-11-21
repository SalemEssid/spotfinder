import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth';
import { forbidden, HttpError, notFound } from '../../utils/http-error';
import { hasReviewed, spotExists } from '../spots/spots.repository';
import { idParamSchema } from '../spots/spots.schemas';
import {
  deleteReview,
  findReviewById,
  findReviewsOfSpot,
  insertReview,
  updateReview,
} from './reviews.repository';

const rating = z
  .number('Donnez une note de 1 à 5.')
  .int('Donnez une note de 1 à 5.')
  .min(1, 'Donnez une note de 1 à 5.')
  .max(5, 'Donnez une note de 1 à 5.');

export const createReviewSchema = z.object({
  ratingWifi: rating,
  ratingCalm: rating,
  ratingOutlets: rating,
  ratingPrice: rating,
  comment: z.string().trim().max(500, '500 caractères maximum.').default(''),
});

/** Mounted on /api/spots/:id/reviews */
export const spotReviewsRouter = Router({ mergeParams: true });

spotReviewsRouter.get('/', async (req, res) => {
  const spotId = idParamSchema.parse((req.params as { id: string }).id);
  if (!(await spotExists(spotId))) throw notFound('Ce lieu n’existe pas.');
  res.json(await findReviewsOfSpot(spotId));
});

spotReviewsRouter.post('/', requireAuth, async (req, res) => {
  const spotId = idParamSchema.parse((req.params as { id: string }).id);
  const input = createReviewSchema.parse(req.body);
  const userId = currentUser(req).id;

  if (!(await spotExists(spotId))) throw notFound('Ce lieu n’existe pas.');
  if (await hasReviewed(userId, spotId)) {
    throw new HttpError(409, 'ALREADY_REVIEWED', 'Vous avez déjà laissé un avis sur ce lieu.');
  }
  const id = await insertReview({ spotId, userId, ...input });
  res.status(201).json(await findReviewById(id));
});

/** Mounted on /api/reviews */
export const reviewsRouter = Router();

/** The review `rawId`, if it exists and belongs to the logged-in user (404 / 403 otherwise). */
async function ownReview(rawId: unknown, userId: number, action: string) {
  const id = idParamSchema.parse(rawId);
  const review = await findReviewById(id);
  if (!review) throw notFound('Cet avis n’existe pas.');
  if (review.author.id !== userId)
    throw forbidden(`Vous ne pouvez ${action} que vos propres avis.`);
  return review;
}

/** PUT /api/reviews/:id — the author replaces their ratings and comment. */
reviewsRouter.put('/:id', requireAuth, async (req, res) => {
  const review = await ownReview(req.params.id, currentUser(req).id, 'modifier');
  const input = createReviewSchema.parse(req.body);
  await updateReview(review.id, input);
  res.json(await findReviewById(review.id));
});

/** DELETE /api/reviews/:id — only the author can delete their review. */
reviewsRouter.delete('/:id', requireAuth, async (req, res) => {
  const review = await ownReview(req.params.id, currentUser(req).id, 'supprimer');
  await deleteReview(review.id);
  res.status(204).end();
});
