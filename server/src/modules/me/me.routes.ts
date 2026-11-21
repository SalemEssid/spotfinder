import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth';
import { notFound, unauthorized } from '../../utils/http-error';
import { toUserDto } from '../auth/auth.routes';
import { nameSchema } from '../auth/auth.schemas';
import { countUserActivity, findUserById, updateUserName } from '../auth/users.repository';
import { findReviewsOfUser } from '../reviews/reviews.repository';
import { spotExists } from '../spots/spots.repository';
import { idParamSchema } from '../spots/spots.schemas';
import { listSpots } from '../spots/spots.service';
import { addFavorite, removeFavorite } from './favorites.repository';

/** Espace membre: everything under /api/me requires a session. */
export const meRouter = Router();
meRouter.use(requireAuth);

/** GET /api/me — profile + activity counters. */
meRouter.get('/', async (req, res) => {
  const { id } = currentUser(req);
  const user = await findUserById(id);
  if (!user) throw unauthorized('Aucune session active.');
  res.json({ ...toUserDto(user), stats: await countUserActivity(id) });
});

/** PATCH /api/me — edit the display name. */
meRouter.patch('/', async (req, res) => {
  const { name } = z.object({ name: nameSchema }).parse(req.body);
  const user = await updateUserName(currentUser(req).id, name);
  if (!user) throw unauthorized('Aucune session active.');
  res.json(toUserDto(user));
});

/** GET /api/me/favorites — same shape as the Explorer list. */
meRouter.get('/favorites', async (req, res) => {
  const origin = z
    .object({ lat: z.coerce.number().optional(), lng: z.coerce.number().optional() })
    .transform(({ lat, lng }) =>
      lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : null,
    )
    .parse(req.query);
  res.json(await listSpots({ favoriteOfUserId: currentUser(req).id }, origin, new Date()));
});

/** PUT /api/me/favorites/:spotId — idempotent: adding twice is not an error. */
meRouter.put('/favorites/:spotId', async (req, res) => {
  const spotId = idParamSchema.parse(req.params.spotId);
  if (!(await spotExists(spotId))) throw notFound('Ce lieu n’existe pas.');
  await addFavorite(currentUser(req).id, spotId);
  res.status(204).end();
});

/** DELETE /api/me/favorites/:spotId — idempotent too. */
meRouter.delete('/favorites/:spotId', async (req, res) => {
  const spotId = idParamSchema.parse(req.params.spotId);
  await removeFavorite(currentUser(req).id, spotId);
  res.status(204).end();
});

/** GET /api/me/reviews — "Mes avis". */
meRouter.get('/reviews', async (req, res) => {
  res.json(await findReviewsOfUser(currentUser(req).id));
});
