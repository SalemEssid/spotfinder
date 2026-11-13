import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth';
import { notFound } from '../../utils/http-error';
import { spotExists } from '../spots/spots.repository';
import { idParamSchema } from '../spots/spots.schemas';
import { getHourlyProfile, getLiveMeter, reportCrowd } from './live-meter.service';

/** Mounted on /api/spots/:id — `mergeParams` gives access to `:id`. */
export const liveReportsRouter = Router({ mergeParams: true });

const reportSchema = z.object({
  level: z.enum(['calme', 'moyen', 'sature'], 'Choisissez Calme, Moyen ou Saturé.'),
});

async function existingSpotId(rawId: unknown): Promise<number> {
  const id = idParamSchema.parse(rawId);
  if (!(await spotExists(id))) throw notFound('Ce lieu n’existe pas.');
  return id;
}

/** GET /api/spots/:id/live — current Live Meter estimate. */
liveReportsRouter.get('/live', async (req, res) => {
  const id = await existingSpotId((req.params as { id: string }).id);
  res.json(await getLiveMeter(id, new Date()));
});

/** GET /api/spots/:id/live/hourly — typical occupancy per hour today + best time to go. */
liveReportsRouter.get('/live/hourly', async (req, res) => {
  const id = await existingSpotId((req.params as { id: string }).id);
  res.json(await getHourlyProfile(id, new Date()));
});

/** POST /api/spots/:id/live-reports — "Je suis ici". 429 if the user reported < 15 min ago. */
liveReportsRouter.post('/live-reports', requireAuth, async (req, res) => {
  const id = idParamSchema.parse((req.params as { id: string }).id);
  const { level } = reportSchema.parse(req.body);
  const result = await reportCrowd(id, currentUser(req).id, level, new Date());
  res.status(201).json(result);
});
