# SpotFinder

**Find a place to work, right now.** SpotFinder helps students and remote workers find a quiet café, a library or a
coworking space nearby, with Wi-Fi, power outlets, budget, opening hours and, above all, **live crowd levels**
reported by the community (the "Live Meter").

Web Project · Objective 3 "Development and integration of the main features" · SUP'COM 2026.
The user interface is in French; code, comments and commits are in English.

![Explorer: list, map and filters](docs/screenshots/02-explorer.png)

## Contents

1. [Running the project](#running-the-project)
2. [Features](#features)
3. [The Live Meter](#the-live-meter)
4. [Technical choices](#technical-choices)
5. [Architecture](#architecture)
6. [REST API](#rest-api)
7. [Data model](#data-model)
8. [Quality: tests, accessibility, performance](#quality-tests-accessibility-performance)
9. [Deliberate differences from the brief and the mockups](#deliberate-differences-from-the-brief-and-the-mockups)
10. [Git workflow](#git-workflow)
11. [AI usage (Utilisation de l'IA)](#ai-usage-utilisation-de-lia)
12. [Next steps (P3)](#next-steps-p3)

---

## Running the project

### Requirements

| Tool | Version | Why |
|---|---|---|
| **Node.js** | **24** (see `.nvmrc`, `nvm use`) | Angular 22 and the API; `engines` in `package.json` checks it |
| **Docker Desktop** | recent, running | PostgreSQL 17 in one command (recommended) |
| _or_ PostgreSQL | 14 or later | if Docker is not available (see below) |

### With Docker (recommended): two commands

```bash
git clone <repository-url> spotfinder && cd spotfinder
npm install
npm run dev
```

Open **http://localhost:4200**. `npm run dev` starts the database (Docker), applies the migrations, fills the
database with demo data if it is empty, then starts the API (port 3000) and Angular (port 4200).
No `.env` file is needed in development (safe defaults, see `.env.example`).

### Without Docker (local PostgreSQL)

```bash
cp .env.example .env
# in .env: DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/spotfinder
#          TEST_DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/spotfinder_test
npm install
npm run dev:local-db
```

The `spotfinder` and `spotfinder_test` databases are created automatically if they do not exist.

### Demo account

| E-mail | Password |
|---|---|
| `demo@spotfinder.tn` | `SpotFinder2026` |

The login page has a "Remplir avec le compte démo" (fill in the demo account) button. This account already has
3 favourites and 2 reviews.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | start everything (Docker + API + Angular) |
| `npm run db:reset` | wipe and re-create the demo data |
| `npm run demo:refresh` | **before a demo**: regenerate only the recent crowd reports (keeps accounts, reviews, favourites) |
| `npm test` | server unit and API tests, then Angular tests (the database must be running) |
| `npm run e2e` | end-to-end tests in Chrome, Edge, Firefox, WebKit and on a phone viewport |
| `npm run lint` | ESLint + TypeScript type-check, both parts |
| `npm run preview` | production version: compiled Angular served by Express on http://localhost:3000 |
| `npm run screenshots` | regenerate the screenshots of this README |

> Demo crowd reports are dated relative to when the database was seeded and expire after 2 hours:
> run `npm run demo:refresh` just before presenting. Without recent reports the meter shows the
> "Estimation habituelle" (usual level at this hour), so it is never empty.

---

## Features

Every page of the sitemap (Objective 2) is at most 3 clicks from the home page and is fed by the API.

| Page | Route | Content |
|---|---|---|
| Home (Accueil) | `/` | search, quick filters, places "Près de SUP'COM" (near SUP'COM) with their crowd level, live activity |
| Explorer | `/explorer` | list + map kept in sync, filters stored in the URL, list/map toggle on phones |
| Place page (Fiche d'un lieu) | `/lieux/:id` | details, equipment, opening hours, ratings per criterion, reviews, **Live Meter**, "Je suis ici", favourites |
| Add a place (Ajouter un lieu) | `/ajouter` | dynamic form, pin placed on the map, opening hours per day (several time slots) |
| Member area (Espace membre) | `/compte/profil`, `/favoris`, `/avis` | profile and stats, favourites, my reviews (login required) |
| Login / Sign-up | `/connexion`, `/inscription` | validated forms, back to the requested page afterwards |
| About / Contact | `/a-propos` | how the meter works, contact form, legal notice |

### Priority 1 (must work perfectly)

- [x] **Explorer**: list of `SpotCard`s + Leaflet map; hovering a card highlights its pin and vice versa;
      clicking a pin scrolls the list to that place.
- [x] **Filters**: noise (Silencieux / Modéré / Animé), fast Wi-Fi, outlets, air conditioning, budget (free,
      < 3 DT, < 6 DT), open now, text search (name, area, address, accent-insensitive). The search is debounced
      (300 ms), filters apply without reloading and are **reflected in the URL**
      (`/explorer?bruit=silencieux&wifi=1&prises=1`): shareable and kept after a refresh.
- [x] **Place page**: name, type, address, opening hours (today in bold), equipment, ratings per criterion (bars),
      reviews, Live Meter, "Je suis ici", favourites, map and walking directions.
- [x] **Live Meter**: see [its own section](#the-live-meter).

### Priority 2

- [x] **Authentication**: sign-up, login, logout; hashed passwords (bcrypt); JWT in an `httpOnly` cookie;
      `authGuard` on `/compte` and `/ajouter`.
- [x] **Member area**: profile (editable name, counters), favourites, my reviews (two-step delete).
- [x] **Leave a review**: a 1–5 rating per criterion (Wi-Fi, quiet, outlets, price) + comment, validated on the
      client and the server, one review per person and place.
- [x] **Add a place**: reactive form, pin placed by clicking the map (or with the keyboard, or by geolocation),
      dynamic opening hours; status "À vérifier" (to be checked).
- [x] **Contact**: validation, thank-you message, stored in the database.
- [x] **Notifications**: non-blocking toasts ("Merci ! Affluence mise à jour.", "Ajouté aux favoris.", errors),
      announced to screen readers.

### Small extras

- Pins "pulse" when a report is less than 15 minutes old; loading skeletons; `/` keyboard shortcut for the search;
  empty states that suggest which filter to drop ("Essayez sans le filtre « Prises » ?"); page transitions;
  meter animation; all animations are turned off for users who prefer reduced motion.

### Screenshots

Generated with `npm run screenshots` on the production build (demo data).

| Home (1440 px) | Place page (1440 px) |
|---|---|
| ![Home](docs/screenshots/01-accueil.png) | ![Place page](docs/screenshots/03-fiche.png) |
| **Member area, favourites** | **Add a place** |
| ![Favourites](docs/screenshots/08-favoris.png) | ![Add a place](docs/screenshots/09-ajouter.png) |

| Place page (phone) | "Je suis ici" (phone) | Explorer, map (phone) | Explorer (tablet, 768 px) |
|---|---|---|---|
| ![Place page on a phone](docs/screenshots/04-fiche-mobile.png) | ![Je suis ici](docs/screenshots/05-je-suis-ici-mobile.png) | ![Map on a phone](docs/screenshots/06-explorer-mobile-carte.png) | ![Tablet](docs/screenshots/07-explorer-tablette.png) |

Reference Figma mockups (Objective 2): [`docs/design/`](docs/design/).

---

## The Live Meter

Our signature feature. Code: [`server/src/live-meter/compute-occupancy.ts`](server/src/live-meter/compute-occupancy.ts)
(a pure function, no database and no clock inside) and its tests.

**Reporting.** On the place page, "Je suis ici" (I'm here) opens a sheet: *Calme* (quiet, 25 %), *Moyen*
(medium, 55 %) or *Saturé* (packed, 85 %). One report per person and place every **15 minutes**, enforced on the
server (`429` response with the remaining wait, explained kindly in the interface). A PostgreSQL lock
(`pg_advisory_xact_lock`) prevents a double click from creating two reports.

**Estimating.** Only reports from the last 2 hours count, and recent ones count more:

```text
weight_i  = exp(−age_i / 30 min)
estimate  = Σ (weight_i × occupancy_i) / Σ weight_i
```

Example (a unit test): at 15:00, reports at 14:00 → 80 %, 14:30 → 50 %, 14:50 → 40 %;
weights ≈ 0.135, 0.368, 0.717; **estimate ≈ 47 % · Modéré**.

**Fallback.** No recent report: average of the last 8 weeks, same weekday, same hour (at least 3 reports),
shown as "Estimation habituelle" (usual estimate). No data at all: "Pas encore de signalement" (no report yet).

**Display.** `≈ 47 % · Modéré` (below 40 % Calme, 40–69 % Modéré, 70 % and above Saturé); the colour always comes
with the word; the source is always visible ("3 signalements · il y a 10 min") together with a **reliability**
level computed from Σ weights (a single report from an hour ago weighs 0.14: "Fiabilité faible", low reliability).

**Optimistic update.** After a report the meter changes immediately: a brand-new report weighs 1, so the screen
computes `(old × Σweights + new) / (Σweights + 1)`, exactly what the server is about to answer. The server's answer
then replaces that value, or the previous one comes back if the request fails.

---

## Technical choices

| Layer | Choice | In one line |
|---|---|---|
| Framework | **Angular 22** (standalone components, `OnPush`, no zone.js) | chosen in Objective 1; clear, typed structure that suits a team project |
| State | **Signals** in services | simpler than NgRx or `BehaviorSubject`s for an app this size |
| Async | **RxJS** where time matters | `debounceTime` for the search, `switchMap` to cancel an outdated request |
| Forms | **Reactive Forms** | typed, testable validation; `FormArray` for the dynamic opening hours |
| Map | **Leaflet 1.9** + OpenStreetMap tiles | free, no API key; used directly in a single `MapViewComponent` |
| Icons | **@lucide/angular** | the icon set of the style guide; each icon is a component, only the ones used are shipped |
| Fonts | Space Grotesk + DM Sans via **Fontsource** | the Google Fonts of the style guide, self-hosted (no blocking third-party request) |
| API | **Node.js 24 + Express 5** in TypeScript (`tsx`) | Express 5 forwards errors thrown in `async` handlers to the error handler, no `try/catch` everywhere |
| Database | **PostgreSQL 17** + `pg` with **parameterised SQL** | every query is visible and explainable; it is the SQL of Objective 1 |
| Migrations | plain `.sql` files + a small script | no ORM "magic" |
| Validation | **Zod** (French messages) | one schema = runtime validation + TypeScript type |
| Passwords | **bcryptjs** (cost 10) | slow hashing against brute force, pure JavaScript (nothing to compile on Windows) |
| Session | **JWT** in an `httpOnly`, `SameSite=Lax` cookie, 7 days | unreadable by JavaScript (XSS), not sent by other sites (CSRF), no session table |
| HTTP security | helmet (CSP), restricted CORS, login rate limiting | basic protections without heavy configuration |
| Tests | **Vitest** (server and Angular), Supertest, **Playwright** + axe-core | one test runner on both sides; multi-browser end-to-end tests |
| Dev | npm workspaces, `concurrently`, Docker Compose, Angular proxy | `npm run dev` starts everything; the browser only talks to `localhost:4200` |

**Why the Angular proxy?** `client/proxy.conf.json` forwards `/api/*` from port 4200 to Express (3000): for the
browser everything is on the same origin, so the session cookie is sent automatically, with no CORS setup.

---

## Architecture

```text
spotfinder/
├── client/                      Angular
│   └── src/
│       ├── app/
│       │   ├── pages/           one page per route, lazy-loaded
│       │   ├── components/      HeaderComponent, FooterComponent, FilterBarComponent, SpotCardComponent,
│       │   │                    MapViewComponent, LiveMeterComponent, ReportSheet, RatingBars, StarRating…
│       │   ├── services/        AuthService, SpotService, AccountService, ToastService, ClockService…
│       │   ├── models/          types of the API responses
│       │   ├── guards/ interceptors/ utils/   (filters ⇄ URL, formatting, Live Meter helpers…)
│       │   └── app.routes.ts
│       └── styles/              _tokens.scss (style-guide colours, type, radii), _components.scss…
├── server/                      Express + PostgreSQL
│   ├── src/
│   │   ├── modules/<resource>/  routes → service → repository (SQL)
│   │   ├── live-meter/          computeOccupancy (pure) + constants + tests
│   │   ├── db/                  pool, migrations/*.sql, seed, cli (prepare | migrate | reset | refresh)
│   │   └── middleware/          auth, error handling
│   └── test/                    API tests (Supertest) on a separate `spotfinder_test` database
├── e2e/                         Playwright: journeys, keyboard, accessibility audit
├── docs/                        Figma mockups, screenshots, AI usage log
└── docker-compose.yml
```

**Explorer data flow** (one direction only): URL query params → `filters` signal → API request (`switchMap`) →
`spots` signal → list and map. The filter bar never changes the list directly: it changes the URL.

---

## REST API

All routes are prefixed with `/api`. Responses are JSON, dates are ISO 8601.

| Method | Route | Auth | Purpose | Status codes |
|---|---|---|---|---|
| GET | `/health` | | API and database status | 200 |
| POST | `/auth/register` | | sign up (opens the session) | 201, 400, 409, 429 |
| POST | `/auth/login` | | log in | 200, 400, 401, 429 |
| POST | `/auth/logout` | | log out | 204 |
| GET | `/auth/me` | | current user, or `{ user: null }` | 200 |
| GET | `/spots?q&bruit&wifi&prises&clim&budget&ouvert&type&lat&lng` | | filtered list, sorted by distance | 200, 400 |
| GET | `/spots/:id` | | place detail (+ favourite, already reviewed, next report allowed at) | 200, 400, 404 |
| POST | `/spots` | ✓ | add a place (status `a_verifier`) | 201, 400, 401 |
| GET | `/spots/:id/live` | | Live Meter estimate | 200, 404 |
| GET | `/spots/:id/live/hourly` | | usual crowd level per hour today | 200, 404 |
| POST | `/spots/:id/live-reports` | ✓ | "Je suis ici" `{ level: calme / moyen / sature }` | 201, 400, 401, 404, 429 |
| GET | `/spots/:id/reviews` | | reviews of a place | 200, 404 |
| POST | `/spots/:id/reviews` | ✓ | leave a review | 201, 400, 401, 404, 409 |
| DELETE | `/reviews/:id` | ✓ | delete one's own review | 204, 403, 404 |
| GET | `/me` | ✓ | profile + counters | 200, 401 |
| PATCH | `/me` | ✓ | change one's display name | 200, 400, 401 |
| GET | `/me/favorites` | ✓ | my favourites | 200, 401 |
| PUT / DELETE | `/me/favorites/:spotId` | ✓ | add / remove a favourite (idempotent) | 204, 401, 404 |
| GET | `/me/reviews` | ✓ | my reviews | 200, 401 |
| POST | `/contact` | | contact message | 201, 400, 429 |

Query parameters are French because they also appear in the Explorer URL that users share.

**One error format** (messages in French, ready to display):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Certains champs sont invalides.",
             "details": [{ "field": "email", "message": "Adresse e-mail invalide." }] } }
```

A `429` on `/live-reports` adds `retryAfterSeconds` and `nextReportAllowedAt`, and the `Retry-After` header.

---

## Data model

The entities of Objective 1 are kept ([`001_initial_schema.sql`](server/src/db/migrations/001_initial_schema.sql)):
`users`, `spots`, `equipment`, `live_reports`, `reviews`, `favorites`, `contact_messages`. Adjustments:

- **`opening_hours`** becomes a table (`spot_id, weekday, opens_at, closes_at`) instead of a text field:
  "open now" is a simple SQL condition and a place can close at lunchtime (two time slots).
- Enumerated types for noise, place type, status and role; `CHECK` constraints on ratings (1 to 5), occupancy
  (0 to 100) and budget (0 to 3); **one review per person and place** (`UNIQUE`).
- `spots.area` (neighbourhood) for display and search; index on `live_reports (spot_id, created_at)`.
- Business time zone: `Africa/Tunis` (opening hours, "same weekday, same hour").

**Demo data**: 15 fictional places around El Ghazala, Ariana and Tunis (the first four use the names from our
mockups, coordinates are realistic), 9 accounts, about 30 reviews, 6 weeks of hourly crowd history and recent
reports. The seed is deterministic: everyone gets the same data.

---

## Quality: tests, accessibility, performance

### Automated tests (all passing)

| Suite | Tool | Tests | What is covered |
|---|---|---|---|
| Server, unit | Vitest | 31 | `computeOccupancy` (the 47 % example, 2-hour window, report "from the future"), thresholds, reliability, filters → SQL (including an injection attempt), Tunis time, distances |
| API | Vitest + Supertest | 39 | every resource: auth (`httpOnly` cookie, identical 401, 409), places (filters, accents, distance sort, 404, validated creation), Live Meter (live / usual / none, 429, double click), reviews (409, 403), favourites, profile, contact, JSON errors |
| Angular | Vitest (Angular CLI) | 71 | `SpotCardComponent`, `FilterBarComponent` (debounce), `LiveMeterComponent`, "Je suis ici" sheet, review form, "Add a place" (`FormArray`), `AuthService` + guard, utilities |
| End-to-end | Playwright + axe-core | 20 scenarios | the 3 journeys of the brief, the guard, keyboard use, the accessibility audit; **fails if any error appears in the browser console** |

```bash
npm test     # server (unit + API, separate test database) then Angular
npm run e2e  # with the app running (npm run dev)
```

### Browsers

| Browser | End-to-end result |
|---|---|
| Chrome (Windows) | 20/20, including the 12-page accessibility audit |
| Edge | 7/7 |
| Firefox | 7/7 |
| WebKit (Safari's engine) | 6/6 |
| Phone (Pixel 7, Chrome) | 4/4 |

The accessibility audit runs once (in Chrome): the HTML is the same everywhere. Playwright's WebKit crashed on the
View Transitions API (cross-fade between pages), so it is turned off for WebKit browsers (Safari, iPhone), which
change pages without the fade. We could not test a real Safari (no Mac).

### Accessibility (WCAG 2.1 AA)

- **axe-core: 0 violations** on 12 pages (home, Explorer with and without filters, place page, login, sign-up,
  about, 404, add a place, profile, favourites, my reviews).
- **Contrast** measured for every colour of the style guide, all ≥ 4.5:1, for example: text 13.6:1; button 5.7:1;
  badges Calme 6.6:1, Modéré 6.6:1, Saturé 5.9:1; meter on the ink background 5.0 to 8.4:1; orange text 4.5:1.
- **Keyboard**: "Aller au contenu" skip link, focus always visible, map pins reachable with Tab, `/` shortcut for
  the search, "Je suis ici" sheet closed with Esc, pin placed with the keyboard in "Add a place".
- **Screen readers**: `header` / `nav` / `main` / `footer`, a single `h1` per page, a label on every field, meter
  exposed as `role="meter"`, results, meter and toasts announced (`aria-live`), focus moved to the content on each
  page change. The list is always an alternative to the map.
- Colour never used alone; no text below 14 px; animations off with `prefers-reduced-motion`.

### Responsive

Tested at 375–390 px (phone), 768 px (tablet) and 1440 px (desktop): see the [screenshots](#screenshots).
On phones: bottom tab bar as in the mockup, list/map toggle in the Explorer, "Je suis ici" sheet sliding up from
the bottom of the screen.

### Performance

- **97.7 kB** (gzip) of JavaScript + CSS on first load (Angular budget: 500 kB).
- Each page is lazy-loaded (1 to 11 kB); **Leaflet (40 kB) is only downloaded by pages with a map**;
  the home page uses an SVG map preview instead.
- No photos: SVG illustrations of a few hundred bytes; self-hosted `woff2` fonts (Latin subset only).
- On the API side, the meter of N places costs 3 SQL queries whatever N is; indexes on the most-read tables.

### Security

bcrypt (cost 10); JWT in an `httpOnly` + `SameSite=Lax` cookie (+ `Secure` in production); same response time
whether the e-mail exists or not (no account enumeration); Zod validation on the server for every input;
parameterised SQL only; CSP and security headers (helmet); CORS restricted to the client's origin; rate limits
(login, contact, reports); post-login redirects limited to internal paths; no secrets in Git (`.env.example`).

### Known limitations

- End-to-end tests write to the development database (accounts, reports): run `npm run db:reset` afterwards.
- Contact messages are stored in the database, not sent by e-mail.
- Places "à vérifier" have no moderation screen yet (the `admin` role already exists in the model).
- Logging in with a wrong password returns `401`: the browser logs it in the console, which is expected.
- The OpenStreetMap background needs an Internet connection.

---

## Deliberate differences from the brief and the mockups

All agreed with the team in Phase 0, or listed here:

1. **Mockup labels**: "15 % · Silencieux" and "40 % · Calme" do not follow the brief's thresholds. We follow the
   brief (Calme / Modéré / Saturé; 40 % = Modéré); noise stays a separate equipment attribute.
2. **"Modéré" colour**: the style guide only had Calme (green) and Saturé (orange). We added an amber, checked for
   contrast, always shown with the word.
3. **Map pins**: besides the colour, 1, 2 or 3 bars show the level; text labels are hidden when zoomed out so they
   do not overlap (the hovered pin keeps its label).
4. **Distance** shown from SUP'COM ("350 m de SUP'COM") as long as the user does not share their position.
5. **Places "à vérifier"** are visible in the Explorer with a badge (otherwise, with no admin page, they would
   never appear).
6. **Fonts** self-hosted (Fontsource) instead of the Google Fonts link: same fonts, no third-party request that
   blocks rendering (a real problem found by the end-to-end tests on an unreliable network).
7. **`GET /api/auth/me`** answers `200 { user: null }` when logged out instead of a `401` error, so the browser
   console does not show an error on every visit.
8. **Full API in Phase 1**: it was specified in Phase 0, so it was written in one go; the user-facing features
   then each got their own branch.

---

## Git workflow

`main` always works. One branch per phase/feature, merged with `--no-ff` so it stays visible in the history;
Conventional Commits messages (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

| Branch | Content |
|---|---|
| `feat/skeleton` | workspaces, Docker, schema, seed, full API, Angular skeleton, design tokens |
| `feat/explorer` | Explorer, filters, map |
| `feat/live-meter` | place page, Live Meter, "Je suis ici" |
| `feat/auth-account` | login, sign-up, member area, favourites, reviews |
| `feat/add-spot-contact` | add a place, about / contact, home page, 404 |
| `chore/quality-pass` | multi-browser e2e, accessibility audit, local fonts, focus management |
| `docs/readme` | this README, screenshots, AI log |

`git log --graph --oneline` shows the structure.

---

## AI usage (Utilisation de l'IA)

Our teacher allows AI tools as long as their use is documented. Here is, honestly, who did what.
The phase-by-phase detail is in [`docs/ai-log.md`](docs/ai-log.md); every commit written with the assistant carries a
`Co-Authored-By: Claude` line (visible with `git log`).

**Tool**: Claude Code (model Claude Opus 5.5, by Anthropic), used in VS Code, following a brief we wrote
([`descProjt.md`](descProjt.md)) and conventions written together ([`CLAUDE.md`](CLAUDE.md)).

**What the team did**

- Objectives 1 and 2: the idea, requirements, data model, sitemap, **Figma mockups and style guide**.
- The Objective 3 brief: priorities, the Live Meter specification (formula, thresholds, 15-minute rule),
  quality requirements.
- The architecture decisions proposed by the AI (Docker first, Angular proxy, Node version, private repository,
  "350 m de SUP'COM", `demo:refresh`…) and approval of the plan.
- Review, manual testing and preparation of the oral defence (to be completed by the team: who reviewed what).

**What Claude Code did**

- Proposed the architecture, libraries and API; pointed out inconsistencies in the brief and the mockups.
- Wrote the code (client, server, SQL, seed), the unit, API and end-to-end tests, the configuration and this README.
- Ran the application, took screenshots to compare with the mockups, and fixed what was wrong.

**How we checked it**: every phase was tested (automated tests + real browsing), and the code is commented where
the "why" is not obvious, so that each of us can explain it orally.

**Limits**: AI can make mistakes or questionable choices; we remain responsible for the code we hand in. The demo
data is fictional.

---

## Next steps (P3)

Already done in a small way: pins that pulse for recent reports, loading skeletons, keyboard shortcut, opt-in
geolocation in "Add a place". Proposals for what comes next, most useful first:

1. **"Best time to go" + crowd-by-hour histogram** on the place page: the API is ready
   (`GET /api/spots/:id/live/hourly` returns the average per hour for today and the quietest upcoming hour).
2. **"Near me"** in the Explorer: use the browser's position (opt-in) as the reference point,
   "350 m de vous" instead of "de SUP'COM".
3. **Moderation** of places "à vérifier" by an administrator.
4. **Real-time meter** (Server-Sent Events) instead of refreshing every minute.
5. **Contributor badges** (first reports, helpful reviews).
6. **Dark mode**: colours are already centralised in `_tokens.scss`.
7. **PWA**: favourites list available offline.
8. **Pin clustering** if the number of places grows a lot.
