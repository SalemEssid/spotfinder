-- SpotFinder — initial schema (entities from Objectif 1, with the adjustments agreed in Phase 0).
-- Conventions: snake_case names, timestamptz for every date, CHECK constraints for business rules
-- the database can enforce on its own.

-- Accent-insensitive search: "bibliotheque" must find "Bibliothèque".
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE user_role   AS ENUM ('user', 'admin');
CREATE TYPE spot_type   AS ENUM ('cafe', 'bibliotheque', 'coworking', 'salon_de_the', 'autre');
CREATE TYPE spot_status AS ENUM ('a_verifier', 'publie');
CREATE TYPE noise_level AS ENUM ('silencieux', 'modere', 'anime');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  email         TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE spots (
  id          SERIAL PRIMARY KEY,
  name        TEXT             NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  type        spot_type        NOT NULL,
  address     TEXT             NOT NULL,
  area        TEXT             NOT NULL,  -- neighbourhood shown in the UI and used by the text search
  latitude    DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude   DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  description TEXT             NOT NULL DEFAULT '',
  status      spot_status      NOT NULL DEFAULT 'a_verifier',
  created_by  INT              REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- One row per spot (1–1 with spots).
CREATE TABLE equipment (
  spot_id          INT         PRIMARY KEY REFERENCES spots (id) ON DELETE CASCADE,
  wifi_speed       INT         NOT NULL DEFAULT 0 CHECK (wifi_speed >= 0),    -- Mbps, 0 = no Wi-Fi
  outlets_count    INT         NOT NULL DEFAULT 0 CHECK (outlets_count >= 0),
  noise_level      noise_level NOT NULL,
  price_level      SMALLINT    NOT NULL CHECK (price_level BETWEEN 0 AND 3),  -- 0 free, 1 < 3 DT, 2 3–6 DT, 3 > 6 DT
  air_conditioning BOOLEAN     NOT NULL DEFAULT false
);

-- Opening hours as rows instead of free text, so "ouvert maintenant" is a simple SQL condition
-- and a place can have split hours (09:00–12:00 then 14:00–18:00).
CREATE TABLE opening_hours (
  spot_id   INT      NOT NULL REFERENCES spots (id) ON DELETE CASCADE,
  weekday   SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),  -- 0 = Sunday, like EXTRACT(DOW) and JS getDay()
  opens_at  TIME     NOT NULL,
  closes_at TIME     NOT NULL,                                  -- '24:00' means midnight
  PRIMARY KEY (spot_id, weekday, opens_at),
  CHECK (closes_at > opens_at)
);

CREATE TABLE live_reports (
  id         SERIAL PRIMARY KEY,
  spot_id    INT         NOT NULL REFERENCES spots (id) ON DELETE CASCADE,
  user_id    INT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  occupancy  SMALLINT    NOT NULL CHECK (occupancy BETWEEN 0 AND 100),  -- percent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- The Live Meter always reads "recent reports of one spot": this index serves exactly that.
CREATE INDEX live_reports_spot_time_idx ON live_reports (spot_id, created_at DESC);
-- The 15-minute rate limit looks up "last report of this user for this spot".
CREATE INDEX live_reports_user_spot_time_idx ON live_reports (user_id, spot_id, created_at DESC);

CREATE TABLE reviews (
  id             SERIAL PRIMARY KEY,
  spot_id        INT         NOT NULL REFERENCES spots (id) ON DELETE CASCADE,
  user_id        INT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating_wifi    SMALLINT    NOT NULL CHECK (rating_wifi    BETWEEN 1 AND 5),
  rating_calm    SMALLINT    NOT NULL CHECK (rating_calm    BETWEEN 1 AND 5),
  rating_outlets SMALLINT    NOT NULL CHECK (rating_outlets BETWEEN 1 AND 5),
  rating_price   SMALLINT    NOT NULL CHECK (rating_price   BETWEEN 1 AND 5),
  comment        TEXT        NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One review per person per place, so one account cannot flood a place's ratings.
  UNIQUE (spot_id, user_id)
);

CREATE TABLE favorites (
  user_id    INT         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  spot_id    INT         NOT NULL REFERENCES spots (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);

CREATE TABLE contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  message    TEXT        NOT NULL CHECK (char_length(message) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
