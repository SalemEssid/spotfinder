# SpotFinder — Build brief for Claude Code (Projet Web · Objectif 3)

You are joining a student team at SUP'COM (Tunis) as a senior full-stack engineer and mentor.
Your job: turn our validated design (Objectif 2) into a **real, working website**, with clean code the team can read, explain and defend in front of our teacher.

Read this whole file before writing any code. Then follow the phases in section 9.

---

## 1. The product in one paragraph

**SpotFinder** is a collaborative web app that helps students and remote workers (18–35) find a place to study or work **right now**: a calm café, a library, a coworking space. Users filter places by noise, Wi-Fi, power outlets, budget and opening hours, see them on a map, and — the original feature — see **live crowd levels** ("Live Meter") reported by the community. Someone on site taps **"Je suis ici"**, says how crowded it is, and the estimate updates for everyone.

Value proposition: *find a suitable spot in under 30 seconds.*

UI language: **French**. Code, identifiers and commit messages: **English**.

---

## 2. What the teacher requires (non-negotiable)

Objectif 3 = "Développement et intégration des fonctionnalités principales". The deliverable must contain:

- A working website with **at least 3–5 dynamic pages**.
- A **complete frontend** built with our chosen framework: **Angular**.
- A **minimal backend or a simulated API**.
- **Dynamic navigation** (menu, routes, links between pages).
- **Responsive** layout: mobile, tablet, desktop.
- **Dynamic forms** (search, sign-up, contact, etc.), **user interactions** (buttons, filters, notifications, animations), **state management**.
- A clean folder structure (`src/`, `components/`, `assets/`, `services/`, …) and clear naming conventions from day one.
- Git with **clear commits** and **one branch per feature**.
- Every component tested before final integration.
- Checked for: multi-browser compatibility (Chrome, Firefox, Edge, Safari), links/forms/interactions, performance (image weight, fast load), code structure, accessibility (semantic tags, contrast).
- A short **README** explaining: the framework choice, the features built, and the steps to run the project.
- **Our teacher allows AI tools but requires that their use be documented.** The README must contain a section "Utilisation de l'IA" describing honestly what you (Claude Code) did and what the team did.

Teacher's advice we must follow: *build the priority features first; add extras only once the core works perfectly. Code quality matters as much as visuals.*

Delivery format: GitHub repository link (or `GroupeX_Projet_Web_Objectif3.zip`).

---

## 3. Technical stack (already presented to the teacher — keep it)

| Layer | Choice |
|---|---|
| Frontend | **Angular** (latest stable CLI, standalone components), TypeScript, **SCSS**, RxJS |
| Map | **Leaflet** + OpenStreetMap tiles (no API key) |
| Backend | **Node.js + Express**, REST API, TypeScript preferred |
| Database | **PostgreSQL** (relational, as promised in Objectif 1) |
| Tools | Git + GitHub, Figma (prototypes) |

Inside this stack you choose the details (signals vs. pure RxJS, ORM or query builder or raw SQL, validation library, test runner…). Pick simple, well-known options a 2nd-year engineering student can understand. **Justify each choice in one line in the README.**

Constraints:
- One command (or two) to run everything locally. Use `docker compose` for PostgreSQL if Docker is available; **ask me first** if you are unsure whether we have Docker.
- A **seed script** that fills the database with demo data and a demo account.
- No paid services, no API keys required.

---

## 4. Pages and routes (from our sitemap — every page ≤ 3 clicks from home)

```text
Accueil (/)
├── Explorer (/explorer)                 list + map + filters
│   └── Fiche d'un lieu (/lieux/:id)     details, Live Meter, reviews
│       ├── Signaler l'affluence         ("Je suis ici" → bottom sheet / dialog)
│       └── Laisser un avis
├── Ajouter un lieu (/ajouter)           form, pick location on the map
├── Espace membre (/compte)              requires login
│   ├── Profil
│   ├── Favoris
│   └── Mes avis
├── Connexion / Inscription (/connexion, /inscription)
└── À propos / Contact (/a-propos)       contact form
```

Key user journeys that must work end to end:
1. **Find a calm spot (2 clicks):** Accueil → search or filter → Explorer shows matching places.
2. **Report crowding (3 clicks):** Accueil → Explorer → Fiche → "Je suis ici" → choose level → the Live Meter updates.
3. **Find my favourites (2 clicks):** header → Espace membre → Favoris.

Filters must be reflected in the **URL query params** (e.g. `/explorer?calme=1&wifi=1&prises=1`) so a filtered search can be shared and survives a refresh.

---

## 5. Core features, in priority order

**P1 — must work perfectly (build these first)**
1. **Explorer**: results list (SpotCards) + interactive Leaflet map, kept in sync (hover/click a card highlights its pin and vice versa). Filters update results instantly without reloading (debounced search input, RxJS or signals). Mobile: toggle between list and map.
2. **Filters**: noise level (Silencieux / Modéré / Animé), Wi-Fi rapide, prises à proximité, climatisation, budget (Gratuit, < 3 DT, …), ouvert maintenant, plus a text search on name/area.
3. **Fiche d'un lieu**: name, type, address, opening hours, equipment, ratings per criterion (bar chart), reviews, Live Meter, "Je suis ici" button, add to favourites.
4. **Live Meter** — see section 6. This is our signature feature; give it the most care.

**P2 — required for the deliverable**
5. **Auth**: sign-up, login, logout (hashed passwords, JWT or session — your choice, explain it). Route guard on `/compte`.
6. **Espace membre**: profile, favourites, my reviews.
7. **Laisser un avis**: rating per criterion (Wi-Fi, calme, prises, prix) + comment, with validation.
8. **Ajouter un lieu**: reactive form with validation; the user clicks on the map to place the pin; new places get status `à vérifier`.
9. **Contact form** on À propos (validation + success message; storing it in the DB is enough).
10. **Notifications**: non-blocking toasts ("Merci ! Affluence mise à jour", "Ajouté aux favoris", errors).

**P3 — extras, only if P1 and P2 are solid**
Ideas (pick none, some, or propose better ones): contributor badges, "near me" with browser geolocation (opt-in), dark mode, skeleton loaders, PWA/offline list, an "affluence by hour" histogram on the Fiche, a "best time to go" hint.

---

## 6. The Live Meter — specification

**Report.** A logged-in user on a place page taps **"Je suis ici"** and picks one level:

| Choice | Stored occupancy |
|---|---|
| Calme | 25 % |
| Moyen | 55 % |
| Saturé | 85 % |

Rate limit: one report per user per place every 15 minutes (enforce it on the backend, explain it kindly in the UI).

**Estimate.** Recent reports count more than old ones:

```text
weight_i  = exp( − age_i / 30 min )        only reports with age ≤ 2 h
estimate  = Σ (weight_i × occupancy_i) / Σ weight_i
```

Worked example (must be a unit test): now = 15:00, reports at 14:00 → 80 %, 14:30 → 50 %, 14:50 → 40 %.
Weights ≈ 0.135, 0.368, 0.717 → estimate ≈ **47 %**.

**Fallback.** If there is no report in the last 2 h: use the historical average for the same weekday and hour, labelled "Estimation habituelle". If there is no data at all: show "Pas encore de signalement".

**Display.**
- `≈ 47 % · Modéré` — label thresholds: < 40 % Calme, 40–69 % Modéré, ≥ 70 % Saturé.
- Always show the source: "3 signalements · il y a 10 min". Users must know how much to trust it.
- A colour is **always paired with a word** (never colour alone).
- After a report, the meter updates immediately on screen (optimistic update, rolled back on error).

Put the calculation in **one pure, well-tested function** on the backend (`computeOccupancy(reports, now)`), and explain it in a comment a classmate could follow.

---

## 7. Design system (from our Objectif 2 style guide — follow it faithfully)

The goal stated by the teacher: *a site visually faithful to our mockup and smooth to use.*

**Figma file (prototypes, components, style guide):** https://www.figma.com/design/B2rH4LnSvO1ACp0qT9PRgF
Exported screens are in `docs/design/` (add them there before starting): Accueil, Explorer, Fiche (mobile), Signaler l'affluence (mobile), and the wireframes.
If a Figma connection is available in this environment, you may read the file; otherwise work from the PNGs and the tokens below.

**Colours** (define them once as CSS custom properties / SCSS tokens):

| Token | Hex | Use |
|---|---|---|
| `--vert-canard` | `#16706B` | primary: buttons, links, calm places |
| `--encre` | `#172A2E` | text, headings, dark surfaces |
| `--sable` | `#F6F4EE` | page background |
| `--orange` | `#E07A1F` | accent: saturated places, alerts (use `#B5530F` for orange text on light backgrounds) |
| `--menthe` | `#7FD1C3` | numbers and text on dark surfaces |
| `--surface` | `#FDFCF8` | cards |
| `--bordure` | `#DDD8CC` | borders |
| `--texte-2` | `#4A5560` | secondary text |
| calm badge | bg `#D7EDE8` / text `#0F5A55` | |
| saturated badge | bg `#F6DFCB` / text `#8A3E0B` | |

**Typography:** Space Grotesk (headings), DM Sans (text, buttons) — Google Fonts. Sizes: title 40, subtitle 24, body 16, caption 14. **No text below 14 px.**

**Rules:** rounded corners everywhere; one action colour (green); colour always paired with a word; contrast ≥ 4.5:1 (WCAG AA); icons in a linear rounded style (Lucide).

**Components to build** (names already shown to the teacher — keep them):
`HeaderComponent`, `FooterComponent`, `FilterBarComponent`, `SpotCardComponent`, `MapViewComponent`, `LiveMeterComponent`. Add others as needed (button, chip, badge, rating bars, toast, bottom sheet…).

**Images:** do not hotlink or copy photos from the web. Use simple SVG illustrations (like the desk + lamp in our mockups) or let users upload photos later. Lazy-load anything heavy.

---

## 8. Data model (from Objectif 1 — keep these entities, adjust fields if needed)

```text
users          (id, name, email, password_hash, role, created_at)
spots          (id, name, type, address, latitude, longitude, description, opening_hours, status, created_by, created_at)
equipment      (spot_id, wifi_speed, outlets_count, noise_level, price_level, air_conditioning)
live_reports   (id, spot_id, user_id, occupancy, created_at)
reviews        (id, spot_id, user_id, rating_wifi, rating_calm, rating_outlets, rating_price, comment, created_at)
favorites      (user_id, spot_id, created_at)
contact_messages (id, name, email, message, created_at)
```

Seed: 12–15 **fictional** places around Ariana / El Ghazala / Tunis (realistic coordinates, invented names — reuse the ones from our mockups: Café Le Pupitre, Bibliothèque municipale, Salon de thé Nour, Espace coworking Ghazala…), varied equipment, a few reviews, and live reports spread over the last 2 hours so the Live Meter shows real values on first launch. One demo account: `demo@spotfinder.tn` / a password documented in the README.

Design a clean REST API (resources, status codes, validation, error format). Document the endpoints in the README (a table is enough).

---

## 9. How to work — phases with checkpoints

Work in phases. **At the end of each phase, stop, summarise what you did in 5–10 lines, list what I should test by hand, and wait for my go-ahead.** One Git branch per phase/feature, merged into `main` when it works. Small, clear commits (Conventional Commits style: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`).

- **Phase 0 — Plan (no code yet).** Read this file and `docs/design/`. Propose: the folder structure, the main libraries with one-line reasons, the API endpoint list, and the order of work. Ask me any question that would change the architecture. Create a `CLAUDE.md` with the project conventions you will follow.
- **Phase 1 — Skeleton.** Angular app + Express API + PostgreSQL + seed, running locally with one or two commands. Routing for all pages (empty pages are fine), Header/Footer, design tokens and fonts.
- **Phase 2 — Explorer + filters + map** (P1).
- **Phase 3 — Fiche d'un lieu + Live Meter + "Je suis ici"** (P1). Unit tests for `computeOccupancy`.
- **Phase 4 — Auth, Espace membre, favourites, reviews** (P2).
- **Phase 5 — Ajouter un lieu, Contact, notifications, Accueil polish** (P2).
- **Phase 6 — Quality pass:** responsive check at 375 / 768 / 1440 px, keyboard navigation, semantic HTML, contrast, performance (bundle size, lazy-loaded routes, images), cross-browser notes, tests for key components and endpoints.
- **Phase 7 — README + AI documentation**, final cleanup. Then propose P3 extras.

---

## 10. Quality bar

- **Correctness before polish.** A feature is done when it works with real data from the API, handles loading / empty / error states, and survives a page refresh.
- **Readable code.** Small components, typed models, services for HTTP and state, no logic in templates beyond display, no dead code, no `any` without a reason. Short comments where the *why* isn't obvious.
- **Security basics.** Hashed passwords, server-side validation, parameterised SQL, no secrets committed (`.env.example` instead), CORS restricted to the dev origin.
- **Accessibility.** Semantic landmarks (`header`, `nav`, `main`, `footer`), labels on every form field, visible focus, `alt` text, map not the only way to reach a place (the list is), respect `prefers-reduced-motion`.
- **Tests.** At minimum: `computeOccupancy`, filter logic, one API route per resource, and key components (SpotCard, LiveMeter, FilterBar).
- **Explain as you go.** We are students and must defend this code orally. When you make a non-obvious decision, explain it briefly in the PR/commit description or in the README.

---

## 11. Where you have creative freedom

Within the non-negotiables above, **be creative and opinionated**. Surprise us. In particular, you decide:

- Micro-interactions and animations: how the Live Meter animates when it updates, how the bottom sheet opens, hover states on cards and pins, transitions between pages.
- Empty, loading and error states that feel designed, not default ("Aucun lieu calme ici… essayez sans le filtre Prises ?").
- Map details: custom pins coloured by crowd level, clustering, a "search this area" button, a pulse on places with very recent reports.
- Small touches that serve the value proposition "find a spot in 30 seconds": smart default filters, "ouvert maintenant" badges, a "meilleur moment pour y aller" hint, keyboard shortcuts.
- Microcopy in French: friendly, short, clear.
- Code architecture details, as long as you justify them.

If you think something in this brief is wrong or could be better (UX, data model, the Live Meter formula), **say so and propose an alternative before implementing it**. Don't silently deviate.

---

## 12. Definition of done (final check before delivery)

- [ ] `git clone` → follow README → app runs on a fresh machine.
- [ ] All pages in section 4 reachable; the 3 user journeys work end to end.
- [ ] At least 5 dynamic pages fed by the API.
- [ ] Live Meter: report → estimate updates; unit test with the 14:00/14:30/14:50 example passes.
- [ ] Responsive at 375 / 768 / 1440 px; tested in at least Chrome and Firefox.
- [ ] No console errors; lint and tests pass.
- [ ] Visually faithful to the Figma mockups and style guide.
- [ ] README: framework choice, features, API table, launch steps, demo account, **Utilisation de l'IA**.

Start with **Phase 0** now.