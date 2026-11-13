# SpotFinder

**Trouvez où travailler, maintenant.** SpotFinder aide les étudiants et télétravailleurs à trouver un café calme,
une bibliothèque ou un coworking autour d'eux, avec le Wi-Fi, les prises, le budget, les horaires, et surtout
**l'affluence en direct** signalée par la communauté (« Live Meter »).

Projet Web · Objectif 3 « Développement et intégration des fonctionnalités principales » · SUP'COM 2026.

![Explorer : liste, carte et filtres](docs/screenshots/02-explorer.png)

## Sommaire

1. [Lancer le projet](#lancer-le-projet)
2. [Fonctionnalités](#fonctionnalités)
3. [Le Live Meter](#le-live-meter)
4. [Choix techniques](#choix-techniques)
5. [Architecture](#architecture)
6. [API REST](#api-rest)
7. [Modèle de données](#modèle-de-données)
8. [Qualité : tests, accessibilité, performance](#qualité--tests-accessibilité-performance)
9. [Écarts assumés par rapport au brief et à la maquette](#écarts-assumés-par-rapport-au-brief-et-à-la-maquette)
10. [Organisation Git](#organisation-git)
11. [Utilisation de l'IA](#utilisation-de-lia)
12. [Pistes d'amélioration (P3)](#pistes-damélioration-p3)

---

## Lancer le projet

### Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| **Node.js** | **24** (voir `.nvmrc`, `nvm use`) | Angular 22 et l'API ; `engines` le vérifie dans `package.json` |
| **Docker Desktop** | récent, démarré | base PostgreSQL 17 en une commande (recommandé) |
| _ou_ PostgreSQL | 14 ou plus | si Docker n'est pas disponible (voir plus bas) |

### Avec Docker (recommandé) : deux commandes

```bash
git clone <url-du-dépôt> spotfinder && cd spotfinder
npm install
npm run dev
```

Ouvrez **http://localhost:4200**. `npm run dev` démarre la base (Docker), applique les migrations, remplit la base
avec les données de démonstration si elle est vide, puis lance l'API (port 3000) et Angular (port 4200).
Aucun fichier `.env` n'est nécessaire en développement (valeurs par défaut sûres, voir `.env.example`).

### Sans Docker (PostgreSQL installé localement)

```bash
cp .env.example .env
# dans .env : DATABASE_URL=postgres://postgres:motdepasse@localhost:5432/spotfinder
#             TEST_DATABASE_URL=postgres://postgres:motdepasse@localhost:5432/spotfinder_test
npm install
npm run dev:local-db
```

Les bases `spotfinder` et `spotfinder_test` sont créées automatiquement si elles n'existent pas.

### Compte de démonstration

| E-mail | Mot de passe |
|---|---|
| `demo@spotfinder.tn` | `SpotFinder2026` |

La page de connexion propose un bouton « Remplir avec le compte démo ». Ce compte a déjà 3 favoris et 2 avis.

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | tout démarrer (Docker + API + Angular) |
| `npm run db:reset` | effacer et recréer les données de démonstration |
| `npm run demo:refresh` | **avant une démo** : régénère seulement les signalements récents (garde comptes, avis, favoris) |
| `npm test` | tests unitaires et d'API (serveur) puis tests Angular (la base doit tourner) |
| `npm run e2e` | tests de bout en bout dans Chrome, Edge, Firefox, WebKit et sur mobile |
| `npm run lint` | ESLint + vérification TypeScript des deux parties |
| `npm run preview` | version de production : Angular compilé servi par Express sur http://localhost:3000 |
| `npm run screenshots` | régénère les captures de ce README |

> Les signalements de démonstration sont datés par rapport au moment du seed et expirent au bout de 2 h :
> lancez `npm run demo:refresh` juste avant de présenter. Sans signalement récent, la jauge affiche
> l'« estimation habituelle », elle n'est donc jamais vide.

---

## Fonctionnalités

Toutes les pages du plan du site (Objectif 2) sont à 3 clics maximum de l'accueil et alimentées par l'API.

| Page | Route | Contenu |
|---|---|---|
| Accueil | `/` | recherche, filtres rapides, lieux « Près de SUP'COM » avec leur affluence, activité en direct |
| Explorer | `/explorer` | liste + carte synchronisées, filtres dans l'URL, bascule liste/carte sur mobile |
| Fiche d'un lieu | `/lieux/:id` | infos, équipements, horaires, notes par critère, avis, **Live Meter**, « Je suis ici », favoris |
| Ajouter un lieu | `/ajouter` | formulaire dynamique, repère à placer sur la carte, horaires par jour (créneaux multiples) |
| Espace membre | `/compte/profil`, `/favoris`, `/avis` | profil et statistiques, favoris, mes avis (protégé) |
| Connexion / Inscription | `/connexion`, `/inscription` | formulaires validés, retour à la page demandée |
| À propos / Contact | `/a-propos` | explication de la jauge, formulaire de contact, mentions légales |

### Priorité 1 (doit marcher parfaitement)

- [x] **Explorer** : liste de `SpotCard` + carte Leaflet ; survoler une carte met son repère en avant et inversement ;
      cliquer un repère fait défiler la liste jusqu'au lieu.
- [x] **Filtres** : bruit (Silencieux / Modéré / Animé), Wi-Fi rapide, prises, clim, budget (Gratuit, < 3 DT, < 6 DT),
      ouvert maintenant, recherche texte (nom, quartier, adresse, sans tenir compte des accents). Recherche
      « debouncée » (300 ms), filtres appliqués sans rechargement et **reflétés dans l'URL**
      (`/explorer?bruit=silencieux&wifi=1&prises=1`) : partageables et conservés au rafraîchissement.
- [x] **Fiche d'un lieu** : nom, type, adresse, horaires (aujourd'hui en gras), équipements, notes par critère
      (barres), avis, Live Meter, « Je suis ici », favoris, carte et itinéraire à pied.
- [x] **Live Meter** : voir [la section dédiée](#le-live-meter).

### Priorité 2

- [x] **Authentification** : inscription, connexion, déconnexion ; mots de passe hachés (bcrypt) ; JWT dans un
      cookie `httpOnly` ; `authGuard` sur `/compte` et `/ajouter`.
- [x] **Espace membre** : profil (nom modifiable, compteurs), favoris, mes avis (suppression en deux temps).
- [x] **Laisser un avis** : une note de 1 à 5 par critère (Wi-Fi, calme, prises, prix) + commentaire, validé côté
      client et serveur, un avis par personne et par lieu.
- [x] **Ajouter un lieu** : formulaire réactif, repère placé en cliquant sur la carte (ou au clavier, ou par
      géolocalisation), horaires dynamiques ; statut « À vérifier ».
- [x] **Contact** : validation, message de remerciement, enregistré en base.
- [x] **Notifications** : toasts non bloquants (« Merci ! Affluence mise à jour. », « Ajouté aux favoris. », erreurs),
      annoncés aux lecteurs d'écran.

### Petits plus

- Repères qui « pulsent » quand un signalement a moins de 15 min ; squelettes de chargement ; raccourci clavier
  `/` pour la recherche ; états vides qui proposent quoi retirer (« Essayez sans le filtre « Prises » ? ») ;
  transitions entre pages ; animation de la jauge ; tout est désactivé si l'utilisateur préfère moins d'animations.

### Captures d'écran

Générées avec `npm run screenshots` sur la version de production (données de démonstration).

| Accueil (1440 px) | Fiche d'un lieu (1440 px) |
|---|---|
| ![Accueil](docs/screenshots/01-accueil.png) | ![Fiche d'un lieu](docs/screenshots/03-fiche.png) |
| **Espace membre, favoris** | **Ajouter un lieu** |
| ![Favoris](docs/screenshots/08-favoris.png) | ![Ajouter un lieu](docs/screenshots/09-ajouter.png) |

| Fiche (téléphone) | « Je suis ici » (téléphone) | Explorer, carte (téléphone) | Explorer (tablette, 768 px) |
|---|---|---|---|
| ![Fiche mobile](docs/screenshots/04-fiche-mobile.png) | ![Je suis ici](docs/screenshots/05-je-suis-ici-mobile.png) | ![Carte mobile](docs/screenshots/06-explorer-mobile-carte.png) | ![Tablette](docs/screenshots/07-explorer-tablette.png) |

Maquettes Figma de référence (Objectif 2) : [`docs/design/`](docs/design/).

---

## Le Live Meter

Notre fonctionnalité signature. Code : [`server/src/live-meter/compute-occupancy.ts`](server/src/live-meter/compute-occupancy.ts)
(fonction pure, sans base de données ni horloge) et ses tests.

**Signaler.** Sur la fiche, « Je suis ici » ouvre une feuille : *Calme* (25 %), *Moyen* (55 %) ou *Saturé* (85 %).
Un signalement par personne et par lieu toutes les **15 minutes**, vérifié côté serveur (réponse `429` avec le délai
restant, expliqué gentiment dans l'interface). Un verrou PostgreSQL (`pg_advisory_xact_lock`) empêche qu'un double
clic crée deux signalements.

**Estimer.** Seuls les signalements des 2 dernières heures comptent, les plus récents davantage :

```text
poids_i     = exp(−âge_i / 30 min)
estimation  = Σ (poids_i × occupation_i) / Σ poids_i
```

Exemple (test unitaire) : à 15 h 00, signalements à 14 h 00 → 80 %, 14 h 30 → 50 %, 14 h 50 → 40 % ;
poids ≈ 0,135, 0,368, 0,717 ; **estimation ≈ 47 % · Modéré**.

**Repli.** Aucun signalement récent : moyenne des 8 dernières semaines, même jour, même heure (au moins 3 signalements),
affichée « Estimation habituelle ». Aucune donnée : « Pas encore de signalement ».

**Affichage.** `≈ 47 % · Modéré` (moins de 40 % Calme, de 40 à 69 % Modéré, 70 % et plus Saturé) ; la couleur est
toujours accompagnée du mot ; la source est toujours visible (« 3 signalements · il y a 10 min ») ainsi qu'une
**fiabilité** calculée à partir de Σ poids (un seul signalement d'il y a 1 h pèse 0,14 : « Fiabilité faible »).

**Mise à jour optimiste.** Après un signalement, la jauge change immédiatement : un signalement neuf pèse 1, donc
l'écran calcule `(ancienne × Σpoids + nouvelle) / (Σpoids + 1)`, exactement ce que le serveur va répondre. La réponse
du serveur remplace ensuite cette valeur, ou l'ancienne revient en cas d'erreur.

---

## Choix techniques

| Couche | Choix | En une ligne |
|---|---|---|
| Framework | **Angular 22** (composants standalone, `OnPush`, sans zone.js) | imposé par l'Objectif 1 ; structure claire et typée, adaptée à un projet d'équipe |
| État | **Signals** dans des services | plus simple que NgRx ou des `BehaviorSubject` pour cette taille d'application |
| Asynchrone | **RxJS** là où le temps compte | `debounceTime` pour la recherche, `switchMap` pour annuler une requête dépassée |
| Formulaires | **Reactive Forms** | validation typée et testable ; `FormArray` pour les horaires dynamiques |
| Carte | **Leaflet 1.9** + tuiles OpenStreetMap | gratuit, sans clé d'API ; utilisé directement dans un seul `MapViewComponent` |
| Icônes | **@lucide/angular** | le jeu d'icônes de la charte ; chaque icône est un composant, seules celles utilisées sont livrées |
| Polices | Space Grotesk + DM Sans via **Fontsource** | les polices Google de la charte, auto-hébergées (aucune requête tierce bloquante) |
| API | **Node.js 24 + Express 5** en TypeScript (`tsx`) | Express 5 transmet les erreurs des fonctions `async` au gestionnaire d'erreurs, sans `try/catch` partout |
| Base | **PostgreSQL 17** + `pg` et **SQL paramétré** | chaque requête est visible et explicable ; c'est le SQL de l'Objectif 1 |
| Migrations | fichiers `.sql` + petit script | pas de « magie » d'ORM |
| Validation | **Zod** (messages en français) | un schéma = validation à l'exécution + type TypeScript |
| Mots de passe | **bcryptjs** (coût 10) | hachage lent contre la force brute, en JavaScript pur (rien à compiler sous Windows) |
| Session | **JWT** dans un cookie `httpOnly`, `SameSite=Lax`, 7 jours | illisible par JavaScript (XSS), non envoyé par un autre site (CSRF), sans table de sessions |
| Sécurité HTTP | helmet (CSP), CORS limité, limitation des tentatives de connexion | protections de base sans configuration lourde |
| Tests | **Vitest** (serveur et Angular), Supertest, **Playwright** + axe-core | un seul lanceur de tests des deux côtés ; e2e multi-navigateurs |
| Dev | npm workspaces, `concurrently`, Docker Compose, proxy Angular | `npm run dev` lance tout ; le navigateur ne parle qu'à `localhost:4200` |

**Pourquoi le proxy Angular ?** `client/proxy.conf.json` transfère `/api/*` de 4200 vers Express (3000) : pour le
navigateur tout est sur la même origine, donc le cookie de session part automatiquement, sans configuration CORS.

---

## Architecture

```text
spotfinder/
├── client/                      Angular
│   └── src/
│       ├── app/
│       │   ├── pages/           une page par route, chargée à la demande (lazy loading)
│       │   ├── components/      HeaderComponent, FooterComponent, FilterBarComponent, SpotCardComponent,
│       │   │                    MapViewComponent, LiveMeterComponent, ReportSheet, RatingBars, StarRating…
│       │   ├── services/        AuthService, SpotService, AccountService, ToastService, ClockService…
│       │   ├── models/          types des réponses de l'API
│       │   ├── guards/ interceptors/ utils/   (filtres ⇄ URL, formats, calculs du Live Meter…)
│       │   └── app.routes.ts
│       └── styles/              _tokens.scss (couleurs, typo, rayons de la charte), _components.scss…
├── server/                      Express + PostgreSQL
│   ├── src/
│   │   ├── modules/<ressource>/ routes → service → repository (SQL)
│   │   ├── live-meter/          computeOccupancy (pur) + constantes + tests
│   │   ├── db/                  pool, migrations/*.sql, seed, cli (prepare | migrate | reset | refresh)
│   │   └── middleware/          auth, gestion d'erreurs
│   └── test/                    tests d'API (Supertest) sur une base `spotfinder_test` séparée
├── e2e/                         Playwright : parcours, clavier, audit d'accessibilité
├── docs/                        maquettes Figma, captures, journal d'utilisation de l'IA
└── docker-compose.yml
```

**Flux de données de l'Explorer** (dans un seul sens) : paramètres de l'URL → signal `filters` → requête API
(`switchMap`) → signal `spots` → liste et carte. La barre de filtres ne modifie jamais la liste directement : elle
modifie l'URL.

---

## API REST

Toutes les routes sont préfixées par `/api`. Les réponses sont en JSON, les dates en ISO 8601.

| Méthode | Route | Auth | Rôle | Codes |
|---|---|---|---|---|
| GET | `/health` | | état de l'API et de la base | 200 |
| POST | `/auth/register` | | inscription (ouvre la session) | 201, 400, 409, 429 |
| POST | `/auth/login` | | connexion | 200, 400, 401, 429 |
| POST | `/auth/logout` | | déconnexion | 204 |
| GET | `/auth/me` | | utilisateur courant ou `{ user: null }` | 200 |
| GET | `/spots?q&bruit&wifi&prises&clim&budget&ouvert&type&lat&lng` | | liste filtrée, triée par distance | 200, 400 |
| GET | `/spots/:id` | | fiche (+ favori, avis déjà donné, prochain signalement possible) | 200, 400, 404 |
| POST | `/spots` | ✓ | ajouter un lieu (statut `a_verifier`) | 201, 400, 401 |
| GET | `/spots/:id/live` | | estimation du Live Meter | 200, 404 |
| GET | `/spots/:id/live/hourly` | | affluence habituelle par heure aujourd'hui | 200, 404 |
| POST | `/spots/:id/live-reports` | ✓ | « Je suis ici » `{ level: calme / moyen / sature }` | 201, 400, 401, 404, 429 |
| GET | `/spots/:id/reviews` | | avis du lieu | 200, 404 |
| POST | `/spots/:id/reviews` | ✓ | laisser un avis | 201, 400, 401, 404, 409 |
| DELETE | `/reviews/:id` | ✓ | supprimer son avis | 204, 403, 404 |
| GET | `/me` | ✓ | profil + compteurs | 200, 401 |
| PATCH | `/me` | ✓ | modifier son nom | 200, 400, 401 |
| GET | `/me/favorites` | ✓ | mes favoris | 200, 401 |
| PUT / DELETE | `/me/favorites/:spotId` | ✓ | ajouter / retirer un favori (idempotent) | 204, 401, 404 |
| GET | `/me/reviews` | ✓ | mes avis | 200, 401 |
| POST | `/contact` | | message de contact | 201, 400, 429 |

**Format d'erreur unique** (messages en français, affichables tels quels) :

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Certains champs sont invalides.",
             "details": [{ "field": "email", "message": "Adresse e-mail invalide." }] } }
```

Un `429` sur `/live-reports` ajoute `retryAfterSeconds` et `nextReportAllowedAt`, et l'en-tête `Retry-After`.

---

## Modèle de données

Les entités de l'Objectif 1 sont conservées ([`001_initial_schema.sql`](server/src/db/migrations/001_initial_schema.sql)) :
`users`, `spots`, `equipment`, `live_reports`, `reviews`, `favorites`, `contact_messages`. Ajustements :

- **`opening_hours`** devient une table (`spot_id, weekday, opens_at, closes_at`) au lieu d'un champ texte :
  « ouvert maintenant » est une simple condition SQL et un lieu peut fermer à midi (deux créneaux).
- Types énumérés pour le bruit, le type de lieu, le statut et le rôle ; `CHECK` sur les notes (1 à 5), l'occupation
  (0 à 100), le budget (0 à 3) ; **un avis par personne et par lieu** (`UNIQUE`).
- `spots.area` (quartier) pour l'affichage et la recherche ; index sur `live_reports (spot_id, created_at)`.
- Heure métier : `Africa/Tunis` (horaires, « même jour, même heure »).

**Données de démonstration** : 15 lieux fictifs autour d'El Ghazala, de l'Ariana et de Tunis (noms des maquettes
pour les quatre premiers, coordonnées réalistes), 9 comptes, environ 30 avis, 6 semaines d'historique d'affluence
par heure et des signalements récents. Le seed est déterministe : tout le monde obtient les mêmes données.

---

## Qualité : tests, accessibilité, performance

### Tests automatisés (tous au vert)

| Suite | Outil | Tests | Ce qui est couvert |
|---|---|---|---|
| Serveur, unitaires | Vitest | 31 | `computeOccupancy` (exemple des 47 %, fenêtre de 2 h, signalement « du futur »), seuils, fiabilité, filtres → SQL (y compris une tentative d'injection), heure de Tunis, distances |
| API | Vitest + Supertest | 39 | chaque ressource : auth (cookie `httpOnly`, 401 identique, 409), lieux (filtres, accents, tri par distance, 404, création validée), Live Meter (live / habituel / aucun, 429, double clic), avis (409, 403), favoris, profil, contact, erreurs JSON |
| Angular | Vitest (Angular CLI) | 71 | `SpotCardComponent`, `FilterBarComponent` (debounce), `LiveMeterComponent`, feuille « Je suis ici », formulaire d'avis, « Ajouter un lieu » (`FormArray`), `AuthService` + garde, utilitaires |
| De bout en bout | Playwright + axe-core | 20 scénarios | les 3 parcours du brief, la garde, le clavier, l'audit d'accessibilité ; **échec si la moindre erreur apparaît dans la console** |

```bash
npm test     # serveur (unitaires + API, base de test séparée) puis Angular
npm run e2e  # avec l'application lancée (npm run dev)
```

### Navigateurs

| Navigateur | Résultat e2e |
|---|---|
| Chrome (Windows) | 20/20, dont l'audit d'accessibilité de 12 pages |
| Edge | 7/7 |
| Firefox | 7/7 |
| WebKit (moteur de Safari) | 6/6 |
| Téléphone (Pixel 7, Chrome) | 4/4 |

L'audit d'accessibilité ne tourne qu'une fois (dans Chrome) : le HTML est le même partout. Le WebKit de Playwright
plantait sur l'API View Transitions (fondu entre les pages) : nous l'avons désactivée pour les navigateurs WebKit
(Safari, iPhone), qui changent donc de page sans fondu. Nous n'avons pas pu tester un vrai Safari (pas de Mac).

### Accessibilité (WCAG 2.1 AA)

- **axe-core : 0 violation** sur 12 pages (accueil, Explorer avec et sans filtres, fiche, connexion, inscription,
  à propos, 404, ajouter, profil, favoris, mes avis).
- **Contrastes** mesurés pour chaque couleur de la charte, tous ≥ 4,5:1, par exemple : texte 13,6:1 ; bouton 5,7:1 ;
  badges Calme 6,6:1, Modéré 6,6:1, Saturé 5,9:1 ; jauge sur fond encre 5,0 à 8,4:1 ; orange en texte 4,5:1.
- **Clavier** : lien « Aller au contenu », focus toujours visible, repères de carte atteignables avec Tab, raccourci
  `/` pour la recherche, feuille « Je suis ici » fermée par Échap, repère placé au clavier dans « Ajouter un lieu ».
- **Lecteurs d'écran** : `header` / `nav` / `main` / `footer`, un seul `h1` par page, étiquette sur chaque champ,
  jauge exposée en `role="meter"`, résultats, jauge et toasts annoncés (`aria-live`), focus déplacé sur le contenu à
  chaque changement de page. La liste est toujours une alternative à la carte.
- Couleur jamais seule ; aucun texte sous 14 px ; animations coupées avec `prefers-reduced-motion`.

### Responsive

Testé à 375–390 px (téléphone), 768 px (tablette) et 1440 px (bureau) : voir les [captures](#captures-décran).
Sur téléphone : barre d'onglets en bas comme dans la maquette, bascule liste/carte dans l'Explorer, feuille
« Je suis ici » qui monte du bas de l'écran.

### Performance

- **97,7 ko** (gzip) de JavaScript + CSS au premier chargement (budget Angular : 500 ko).
- Chaque page est chargée à la demande (1 à 11 ko) ; **Leaflet (40 ko) n'est téléchargé que par les pages avec carte** ;
  l'accueil utilise un aperçu de carte en SVG.
- Aucune photo : illustrations SVG de quelques centaines d'octets ; polices `woff2` auto-hébergées (alphabet latin seul).
- Côté API, la jauge de N lieux coûte 3 requêtes SQL, quel que soit N ; index sur les tables lues le plus souvent.

### Sécurité

bcrypt (coût 10) ; JWT en cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en production) ; même temps de réponse que
l'e-mail existe ou non (pas d'énumération des comptes) ; validation Zod côté serveur sur chaque entrée ; SQL
uniquement paramétré ; CSP et en-têtes de sécurité (helmet) ; CORS limité à l'origine du client ; limites de débit
(connexion, contact, signalements) ; redirections après connexion limitées aux chemins internes ; aucun secret dans
Git (`.env.example`).

### Limites connues

- Les tests e2e écrivent dans la base de développement (comptes, signalements) : `npm run db:reset` ensuite.
- Les messages de contact sont enregistrés en base, pas envoyés par e-mail.
- Les lieux « à vérifier » n'ont pas encore d'écran de modération (le rôle `admin` existe déjà dans le modèle).
- Une connexion avec un mauvais mot de passe renvoie `401` : le navigateur l'affiche dans la console, c'est normal.
- Le fond de carte OpenStreetMap nécessite une connexion Internet.

---

## Écarts assumés par rapport au brief et à la maquette

Tous validés avec l'équipe en Phase 0, ou signalés ici :

1. **Libellés de la maquette** : « 15 % · Silencieux » et « 40 % · Calme » ne suivent pas les seuils du brief.
   Nous suivons le brief (Calme / Modéré / Saturé ; 40 % = Modéré) ; le bruit reste un équipement à part.
2. **Couleur « Modéré »** : la charte n'avait que Calme (vert) et Saturé (orange). Nous avons ajouté un ambre, vérifié
   pour le contraste, toujours accompagné du mot.
3. **Repères de la carte** : en plus de la couleur, 1, 2 ou 3 barres indiquent le niveau ; les étiquettes texte sont
   masquées en vue éloignée pour éviter qu'elles se chevauchent (le repère survolé garde la sienne).
4. **Distance** affichée depuis SUP'COM (« 350 m de SUP'COM ») tant que l'utilisateur ne partage pas sa position.
5. **Lieux « à vérifier »** visibles dans l'Explorer avec un badge (sinon, sans page d'administration, ils
   n'apparaîtraient jamais).
6. **Polices** auto-hébergées (Fontsource) au lieu du lien Google Fonts : mêmes polices, aucune requête tierce
   qui bloque l'affichage (problème réel détecté par les tests e2e sur un réseau instable).
7. **`GET /api/auth/me`** répond `200 { user: null }` hors connexion plutôt qu'une erreur `401`, pour ne pas
   afficher une erreur dans la console à chaque visite.
8. **API complète dès la Phase 1** : spécifiée en Phase 0, elle a été écrite d'un bloc ; les fonctionnalités
   côté interface ont ensuite eu chacune leur branche.

---

## Organisation Git

`main` fonctionne toujours. Une branche par phase/fonctionnalité, fusionnée avec `--no-ff` pour rester visible dans
l'historique ; messages au format Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

| Branche | Contenu |
|---|---|
| `feat/skeleton` | workspaces, Docker, schéma, seed, API complète, squelette Angular, tokens |
| `feat/explorer` | Explorer, filtres, carte |
| `feat/live-meter` | fiche d'un lieu, Live Meter, « Je suis ici » |
| `feat/auth-account` | connexion, inscription, espace membre, favoris, avis |
| `feat/add-spot-contact` | ajouter un lieu, à propos / contact, accueil, 404 |
| `chore/quality-pass` | e2e multi-navigateurs, audit d'accessibilité, polices locales, focus |
| `docs/readme` | ce README, captures, journal IA |

`git log --graph --oneline` montre la structure.

---

## Utilisation de l'IA

Notre enseignant autorise les outils d'IA à condition de documenter leur usage. Voici, honnêtement, qui a fait quoi.
Le détail phase par phase est dans [`docs/ai-log.md`](docs/ai-log.md) ; chaque commit écrit avec l'assistant porte la
mention `Co-Authored-By: Claude` (visible avec `git log`).

**Outil** : Claude Code (modèle Claude Opus 5.5, Anthropic), utilisé dans VS Code, en suivant un cahier des charges
que nous avons rédigé ([`descProjt.md`](descProjt.md)) et des conventions écrites ensemble ([`CLAUDE.md`](CLAUDE.md)).

**Ce que l'équipe a fait**

- Objectifs 1 et 2 : idée, cahier des charges, modèle de données, plan du site, **maquettes Figma et charte graphique**.
- Le brief de l'Objectif 3 : priorités, spécification du Live Meter (formule, seuils, règle des 15 minutes),
  exigences de qualité.
- Les décisions d'architecture proposées par l'IA (Docker d'abord, proxy Angular, version de Node, dépôt privé,
  « 350 m de SUP'COM », `demo:refresh`…) et la validation du plan.
- La relecture, les tests manuels et la préparation de la soutenance (à compléter par l'équipe : qui a relu quoi).

**Ce que Claude Code a fait**

- Proposé l'architecture, les bibliothèques et l'API ; signalé les incohérences du brief et des maquettes.
- Écrit le code (client, serveur, SQL, seed), les tests unitaires, d'API et e2e, la configuration et ce README.
- Lancé l'application, pris des captures d'écran pour comparer avec les maquettes, et corrigé ce qui n'allait pas.

**Comment nous avons vérifié** : chaque phase a été testée (tests automatisés + navigation réelle), et le code est
commenté là où le « pourquoi » n'est pas évident, pour que chacun puisse l'expliquer à l'oral.

**Limites** : l'IA peut se tromper ou faire des choix discutables ; nous restons responsables du code rendu. Les
données de démonstration sont fictives.

---

## Pistes d'amélioration (P3)

Déjà réalisés en petit : repères qui pulsent pour les signalements récents, squelettes de chargement, raccourci
clavier, géolocalisation (sur option) dans « Ajouter un lieu ». Propositions pour la suite, de la plus utile à la
moins urgente :

1. **« Meilleur moment pour y aller » + histogramme d'affluence par heure** sur la fiche : l'API est déjà prête
   (`GET /api/spots/:id/live/hourly` renvoie la moyenne par heure du jour et l'heure la plus calme à venir).
2. **« Près de moi »** dans l'Explorer : utiliser la position du navigateur (sur option) comme point de référence,
   « 350 m de vous » au lieu de « de SUP'COM ».
3. **Modération** des lieux « à vérifier » par un administrateur.
4. **Jauge en temps réel** (Server-Sent Events) au lieu du rafraîchissement chaque minute.
5. **Badges de contributeur** (premiers signalements, avis utiles).
6. **Mode sombre** : les couleurs sont déjà centralisées dans `_tokens.scss`.
7. **PWA** : liste des favoris consultable hors connexion.
8. **Regroupement des repères** (clustering) si le nombre de lieux grandit beaucoup.
