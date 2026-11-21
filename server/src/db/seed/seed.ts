import bcrypt from 'bcryptjs';
import type pg from 'pg';
import {
  LIVE_WINDOW_MINUTES,
  MINUTE_MS,
  OCCUPANCY_BY_CHOICE,
} from '../../live-meter/live-meter.constants';
import {
  COMMUNITY_USERS,
  DEMO_FAVORITES,
  DEMO_REVIEWS,
  DEMO_USER,
  MIXED_COMMENTS,
  NEGATIVE_COMMENTS,
  POSITIVE_COMMENTS,
  SEED_SPOTS,
  type SeedSpot,
} from './seed-data';

/** Days of past reports generated for the "Estimation habituelle" fallback. */
const HISTORY_DAYS = 42;

/**
 * Tunisia uses UTC+1 all year (no daylight saving time since 2009), so a fixed offset is exact here.
 * The API itself never relies on this: it uses `AT TIME ZONE 'Africa/Tunis'` in SQL.
 */
const TUNIS_OFFSET_MS = 60 * MINUTE_MS;

/**
 * Small deterministic random generator (mulberry32): the same seed always gives the same data,
 * so every teammate gets identical demo content.
 */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
  };
}
type Random = ReturnType<typeof createRandom>;

// ---------------------------------------------------------------------------------------------
// Full seed
// ---------------------------------------------------------------------------------------------

/** Wipes every table and inserts the demo data. Runs inside the caller's transaction. */
export async function seedDatabase(client: pg.PoolClient, now: Date): Promise<void> {
  const random = createRandom(2026);

  await client.query(
    `TRUNCATE users, spots, equipment, opening_hours, live_reports, reviews, favorites, contact_messages
     RESTART IDENTITY CASCADE`,
  );

  // Users. Community members get a random password nobody knows: they only exist as authors.
  const demoHash = await bcrypt.hash(DEMO_USER.password, 10);
  const { rows: demoRows } = await client.query<{ id: number }>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    [DEMO_USER.name, DEMO_USER.email, demoHash],
  );
  const demoUserId = demoRows[0]!.id;

  const lockedHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const communityIds: number[] = [];
  for (const [index, name] of COMMUNITY_USERS.entries()) {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO users (name, email, password_hash, created_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [name, `membre${index + 1}@spotfinder.tn`, lockedHash, daysAgo(now, 60 + index * 3)],
    );
    communityIds.push(rows[0]!.id);
  }

  // Places with their equipment and opening hours.
  const spotIdByName = new Map<string, number>();
  for (const spot of SEED_SPOTS) {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO spots (name, type, address, area, latitude, longitude, description, status, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        spot.name,
        spot.type,
        spot.address,
        spot.area,
        spot.latitude,
        spot.longitude,
        spot.description,
        spot.status,
        spot.status === 'a_verifier' ? demoUserId : random.pick(communityIds),
        spot.status === 'a_verifier' ? daysAgo(now, 1) : daysAgo(now, random.int(50, 90)),
      ],
    );
    const spotId = rows[0]!.id;
    spotIdByName.set(spot.name, spotId);

    const e = spot.equipment;
    await client.query(
      `INSERT INTO equipment (spot_id, wifi_speed, outlets_count, noise_level, price_level, air_conditioning)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [spotId, e.wifiSpeed, e.outletsCount, e.noiseLevel, e.priceLevel, e.airConditioning],
    );
    for (const row of spot.hours) {
      await client.query(
        `INSERT INTO opening_hours (spot_id, weekday, opens_at, closes_at) VALUES ($1, $2, $3, $4)`,
        [spotId, row.weekday, row.opensAt, row.closesAt],
      );
    }
  }

  // Reviews: 2–3 per published place, from community members.
  for (const spot of SEED_SPOTS) {
    if (spot.status !== 'publie') continue;
    const authors = shuffle(communityIds, random).slice(0, random.int(2, 3));
    for (const authorId of authors) {
      const ratings = spot.typicalRatings.map((r) => clamp(r + random.int(-1, 1), 1, 5));
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const comments =
        average >= 3.8 ? POSITIVE_COMMENTS : average >= 2.8 ? MIXED_COMMENTS : NEGATIVE_COMMENTS;
      await insertReview(
        client,
        spotIdByName.get(spot.name)!,
        authorId,
        ratings,
        random.pick(comments),
        daysAgo(now, random.int(2, 40)),
      );
    }
  }

  // The demo account's own reviews and favourites.
  for (const review of DEMO_REVIEWS) {
    await insertReview(
      client,
      spotIdByName.get(review.spot)!,
      demoUserId,
      review.ratings,
      review.comment,
      daysAgo(now, random.int(1, 10)),
    );
  }
  for (const name of DEMO_FAVORITES) {
    await client.query(`INSERT INTO favorites (user_id, spot_id, created_at) VALUES ($1, $2, $3)`, [
      demoUserId,
      spotIdByName.get(name),
      daysAgo(now, random.int(1, 20)),
    ]);
  }

  // Live reports: weeks of history + a few recent ones.
  for (const spot of SEED_SPOTS) {
    if (spot.live.kind === 'no-data') continue;
    const spotId = spotIdByName.get(spot.name)!;
    await insertReports(client, generateHistory(spot, spotId, communityIds, now, random));
  }
  await insertReports(client, generateRecentReports(spotIdByName, communityIds, now, random));
}

// ---------------------------------------------------------------------------------------------
// Demo refresh: only the recent reports change, users / reviews / favourites are kept.
// ---------------------------------------------------------------------------------------------

export async function refreshRecentReports(client: pg.PoolClient, now: Date): Promise<number> {
  const random = createRandom(now.getTime() % 100_000);
  const windowStart = new Date(now.getTime() - LIVE_WINDOW_MINUTES * MINUTE_MS);

  // Recent reports (including real ones made during a previous demo) are replaced by fresh ones.
  await client.query(`DELETE FROM live_reports WHERE created_at > $1`, [windowStart]);

  const { rows: spots } = await client.query<{ id: number; name: string }>(
    `SELECT id, name FROM spots`,
  );
  const spotIdByName = new Map(spots.map((s) => [s.name, s.id]));
  const { rows: users } = await client.query<{ id: number }>(
    `SELECT id FROM users WHERE email LIKE 'membre%@spotfinder.tn' ORDER BY id`,
  );
  const reports = generateRecentReports(
    spotIdByName,
    users.map((u) => u.id),
    now,
    random,
  );
  await insertReports(client, reports);
  return reports.length;
}

// ---------------------------------------------------------------------------------------------
// Report generators
// ---------------------------------------------------------------------------------------------

interface GeneratedReport {
  spotId: number;
  userId: number;
  occupancy: number;
  createdAt: Date;
}

/**
 * Recent reports, spread over the last ~110 minutes, following each place's scenario.
 * Generated whatever the time of day, so the Live Meter shows real values at any demo time.
 */
function generateRecentReports(
  spotIdByName: Map<string, number>,
  userIds: number[],
  now: Date,
  random: Random,
): GeneratedReport[] {
  const reports: GeneratedReport[] = [];
  for (const spot of SEED_SPOTS) {
    const spotId = spotIdByName.get(spot.name);
    if (spotId === undefined || spot.live.kind !== 'live') continue;

    const { occupancies } = spot.live;
    const authors = shuffle(userIds, random);
    occupancies.forEach((occupancy, index) => {
      // Oldest first: the last report of the list is the most recent (5–15 min ago).
      const slotsFromEnd = occupancies.length - 1 - index;
      const ageMinutes = 5 + slotsFromEnd * 25 + random.int(0, 10);
      reports.push({
        spotId,
        userId: authors[index % authors.length]!,
        occupancy,
        createdAt: new Date(now.getTime() - ageMinutes * MINUTE_MS),
      });
    });
  }
  return reports;
}

/**
 * Past reports during opening hours, for every day of the last 6 weeks.
 * Each place type has a typical daily rhythm (see `typicalBusyness`), shifted by the place's
 * own `busyness`, with some randomness: this is what "Estimation habituelle" averages.
 */
function generateHistory(
  spot: SeedSpot,
  spotId: number,
  userIds: number[],
  now: Date,
  random: Random,
): GeneratedReport[] {
  const reports: GeneratedReport[] = [];
  const tunisNow = new Date(now.getTime() + TUNIS_OFFSET_MS); // read with getUTC* = Tunis wall clock

  for (let day = 1; day <= HISTORY_DAYS; day++) {
    const localMidnight = Date.UTC(
      tunisNow.getUTCFullYear(),
      tunisNow.getUTCMonth(),
      tunisNow.getUTCDate() - day,
    );
    const weekday = new Date(localMidnight).getUTCDay();

    for (const slot of spot.hours.filter((h) => h.weekday === weekday)) {
      const [openHour] = slot.opensAt.split(':').map(Number) as [number];
      const [closeHour] = slot.closesAt.split(':').map(Number) as [number];
      for (let hour = openHour; hour < closeHour; hour++) {
        const reportsThisHour = random.int(1, 2);
        for (let n = 0; n < reportsThisHour; n++) {
          const busyness =
            typicalBusyness(spot.type, weekday, hour) + spot.busyness + (random.next() - 0.5) * 0.3;
          const localTime = localMidnight + (hour * 60 + random.int(0, 59)) * MINUTE_MS;
          reports.push({
            spotId,
            userId: random.pick(userIds),
            occupancy: occupancyForBusyness(busyness),
            createdAt: new Date(localTime - TUNIS_OFFSET_MS),
          });
        }
      }
    }
  }
  return reports;
}

/** 0 = empty, 1 = packed. A rough daily rhythm per type of place. */
function typicalBusyness(type: SeedSpot['type'], weekday: number, hour: number): number {
  const weekend = weekday === 0 || weekday === 6;
  switch (type) {
    case 'cafe':
      if (hour >= 12 && hour < 14) return 0.75;
      if (hour >= 17 && hour < 20) return 0.8;
      if (hour < 10) return 0.3;
      return weekend ? 0.6 : 0.45;
    case 'bibliotheque':
      if (weekend) return 0.45;
      if ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 17)) return 0.65;
      return 0.35;
    case 'coworking':
      if (weekend) return 0.3;
      return hour >= 9 && hour < 17 ? 0.6 : 0.3;
    case 'salon_de_the':
      if (hour >= 18) return 0.85;
      if (hour >= 15) return 0.6;
      return 0.35;
    default:
      return 0.45;
  }
}

/** Real reports can only be 25, 55 or 85 (Calme / Moyen / Saturé). */
function occupancyForBusyness(busyness: number): number {
  if (busyness < 0.4) return OCCUPANCY_BY_CHOICE.calme;
  if (busyness < 0.7) return OCCUPANCY_BY_CHOICE.moyen;
  return OCCUPANCY_BY_CHOICE.sature;
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** Bulk insert with `unnest`: one query instead of thousands. */
async function insertReports(client: pg.PoolClient, reports: GeneratedReport[]): Promise<void> {
  if (reports.length === 0) return;
  await client.query(
    `INSERT INTO live_reports (spot_id, user_id, occupancy, created_at)
     SELECT * FROM unnest($1::int[], $2::int[], $3::smallint[], $4::timestamptz[])`,
    [
      reports.map((r) => r.spotId),
      reports.map((r) => r.userId),
      reports.map((r) => r.occupancy),
      reports.map((r) => r.createdAt.toISOString()),
    ],
  );
}

async function insertReview(
  client: pg.PoolClient,
  spotId: number,
  userId: number,
  [wifi, calm, outlets, price]: number[],
  comment: string,
  createdAt: Date,
): Promise<void> {
  await client.query(
    `INSERT INTO reviews (spot_id, user_id, rating_wifi, rating_calm, rating_outlets, rating_price, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [spotId, userId, wifi, calm, outlets, price, comment, createdAt],
  );
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * MINUTE_MS);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
