import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth';
import { createSpotSchema, idParamSchema, spotListQuerySchema } from './spots.schemas';
import { createSpot, getSpotDetail, listSpots } from './spots.service';

export const spotsRouter = Router();

/** Optional reference point for distances on the detail page. */
const originSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .transform(({ lat, lng }) =>
    lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : null,
  );

/** GET /api/spots?q=&bruit=&wifi=&prises=&clim=&budget=&ouvert=&type=&lat=&lng= */
spotsRouter.get('/', async (req, res) => {
  const { filters, origin } = spotListQuerySchema.parse(req.query);
  res.json(await listSpots(filters, origin, new Date()));
});

/** GET /api/spots/:id — full detail, personalised when logged in (favourite, rate limit…). */
spotsRouter.get('/:id', async (req, res) => {
  const id = idParamSchema.parse(req.params.id);
  const origin = originSchema.parse(req.query);
  res.json(await getSpotDetail(id, req.user?.id ?? null, origin, new Date()));
});

/** POST /api/spots — "Ajouter un lieu". New places start with status "a_verifier". */
spotsRouter.post('/', requireAuth, async (req, res) => {
  const input = createSpotSchema.parse(req.body);
  const spot = await createSpot(input, currentUser(req).id, new Date());
  res.status(201).location(`/api/spots/${spot.id}`).json(spot);
});
