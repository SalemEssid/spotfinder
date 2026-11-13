# SpotFinder: project conventions

Student project (SUP'COM, Projet Web · Objectif 3). **`descProjt.md` is the source of truth** for scope,
priorities and the Live Meter spec. If it conflicts with this file, the brief wins. Ask before deviating.

## Languages
- **UI text: French** (friendly, short). Code, identifiers, comments, commits: **English**.
- URL paths and query params are French because users see them: `/explorer?bruit=silencieux&wifi=1`.

## Repository layout
```
/                     npm workspaces root (scripts: dev, test, lint, db:reset)
├── client/           Angular app (standalone components, SCSS)
│   └── src/
│       ├── app/
│       │   ├── pages/        one folder per routed page (lazy-loaded)
│       │   ├── components/   reusable UI (HeaderComponent, SpotCardComponent, LiveMeterComponent…)
│       │   ├── services/     HTTP + state services (signals)
│       │   ├── models/       TypeScript interfaces shared by the app
│       │   ├── guards/ interceptors/ utils/
│       │   └── app.routes.ts
│       ├── styles/           _tokens.scss, _typography.scss, global styles
│       └── assets/           SVG illustrations, icons
├── server/           Express 5 API (TypeScript)
│   └── src/
│       ├── modules/<resource>/   <resource>.routes.ts · .service.ts · .repository.ts · .schemas.ts
│       ├── live-meter/           compute-occupancy.ts (pure) + tests
│       ├── db/                   pool, migrations/*.sql, seed.ts
│       ├── middleware/           auth, validate, error-handler
│       └── app.ts / server.ts
├── docs/design/      Figma exports (PNG)
├── docs/ai-log.md    running log of AI-assisted work (feeds README "Utilisation de l'IA")
└── docker-compose.yml
```

## Frontend rules (Angular)
- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()` for DI.
- Keep the `Component` suffix and `.component.ts` file names (the teacher already saw `HeaderComponent` etc.).
  Configure the CLI schematics so generated files follow this.
- **State: signals** in services (`AuthService`, `FavoritesService`, `ToastService`). **RxJS** only where time
  or cancellation matters (debounced search, `switchMap` on filter changes, HTTP).
- No logic in templates beyond display. Use `computed()` or a method. Typed models, no `any` unless a comment says why.
- Every page handles **loading / empty / error** states and survives a refresh (state comes from URL or API).
- Explorer filters live in **URL query params**, and the URL is the single source of truth for filter state.
- Leaflet is used directly through `MapViewComponent` (no wrapper lib) and only in lazy routes.

## Styling
- All colours, radii, spacing and font sizes come from `styles/_tokens.scss` (CSS custom properties).
  **No hard-coded hex values in components.**
- Fonts: Space Grotesk (headings), DM Sans (body/buttons). Sizes 40 / 24 / 16 / 14. **Never below 14px.**
- One action colour (`--vert-canard`). Orange text on light backgrounds uses `#B5530F`.
- **Colour is always paired with a word** (badges, pins, Live Meter).
- Icons: Lucide, linear and rounded. Images: own SVG illustrations only, never hotlinked photos.

## Accessibility (checked on every PR)
- Landmarks `header` / `nav` / `main` / `footer`; one `h1` per page; labels on every field.
- Visible focus styles. Everything keyboard-reachable. Contrast ≥ 4.5:1.
- The list is always an alternative to the map. Respect `prefers-reduced-motion` for all animations.

## Backend rules (Express + PostgreSQL)
- Layers: **routes** (HTTP + validation) → **service** (business rules) → **repository** (SQL only).
- **Raw parameterised SQL with `pg`** (`$1, $2`), never string concatenation. DB is `snake_case`, JSON/TS is `camelCase`,
  and the repository maps between them.
- Validate every body/query with **Zod** in the `validate` middleware.
- All routes under `/api`, plural resource names. Status codes: 200, 201, 204, 400, 401, 403, 404, 409, 429, 500.
- Error format (messages in French, shown to users):
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Certains champs sont invalides.", "details": [{ "field": "email", "message": "Adresse e-mail invalide." }] } }
  ```
- Auth: JWT in an **httpOnly, SameSite=Lax cookie**. Passwords hashed with bcrypt. CORS restricted to the dev origin.
- Timestamps are `timestamptz`. Business time (opening hours, weekday/hour stats) uses **`Africa/Tunis`**.
- No secrets in Git: `.env` is ignored and `.env.example` is committed.

## Live Meter
- `server/src/live-meter/compute-occupancy.ts` exports the pure function `computeOccupancy(reports, now)`.
  No DB access, no `Date.now()` inside. `now` is always passed in so tests are deterministic.
- Constants (half-life 30 min, window 2 h, levels 25/55/85, thresholds 40/70, rate limit 15 min) live in one file.
- The 14:00/14:30/14:50 → ≈ 47 % example from the brief is a required unit test.

## Tests
- Runner: **Vitest** on both sides (Supertest for API routes).
- Required at minimum: `computeOccupancy`, filter logic, one route per resource, `SpotCardComponent`,
  `LiveMeterComponent`, `FilterBarComponent`.
- `npm test` and `npm run lint` must pass before merging to `main`.

## Git workflow
- `main` always runs. One branch per phase/feature: `feat/explorer`, `feat/live-meter`, `fix/…`, `docs/…`.
- Small commits, Conventional Commits in English: `feat(explorer): sync card hover with map pin`.
- Merge with `--no-ff` so each feature stays visible in history.
- AI-assisted commits carry a `Co-Authored-By: Claude` trailer (part of documenting AI use).

## Working agreement (phases from the brief, section 9)
- Work phase by phase. At the end of each phase: stop, summarise in 5–10 lines, list manual tests, wait for go-ahead.
- Build P1 first, then P2. P3 extras only once P1 and P2 are solid.
- After each phase, append to `docs/ai-log.md`: what Claude did, what the team did or decided.
- Explain non-obvious decisions in commit bodies or the README. The team must be able to defend every line orally.
