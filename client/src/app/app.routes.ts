import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

/**
 * Sitemap from Objectif 2: every page ≤ 3 clicks from home.
 * Each page is lazy-loaded: its code (and Leaflet, for map pages) is only downloaded when visited.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'SpotFinder · Trouvez où travailler, maintenant',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'explorer',
    title: 'Explorer · SpotFinder',
    loadComponent: () =>
      import('./pages/explorer/explorer.component').then((m) => m.ExplorerComponent),
  },
  {
    path: 'lieux/:id',
    title: 'Fiche du lieu · SpotFinder',
    loadComponent: () =>
      import('./pages/spot-detail/spot-detail.component').then((m) => m.SpotDetailComponent),
  },
  {
    path: 'ajouter',
    title: 'Ajouter un lieu · SpotFinder',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/add-spot/add-spot.component').then((m) => m.AddSpotComponent),
  },
  {
    path: 'compte',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/account/account.component').then((m) => m.AccountComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profil' },
      {
        path: 'profil',
        title: 'Mon profil · SpotFinder',
        loadComponent: () =>
          import('./pages/account/account-profile.component').then(
            (m) => m.AccountProfileComponent,
          ),
      },
      {
        path: 'favoris',
        title: 'Mes favoris · SpotFinder',
        loadComponent: () =>
          import('./pages/account/account-favorites.component').then(
            (m) => m.AccountFavoritesComponent,
          ),
      },
      {
        path: 'avis',
        title: 'Mes avis · SpotFinder',
        loadComponent: () =>
          import('./pages/account/account-reviews.component').then(
            (m) => m.AccountReviewsComponent,
          ),
      },
    ],
  },
  {
    path: 'connexion',
    title: 'Connexion · SpotFinder',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'inscription',
    title: 'Inscription · SpotFinder',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'a-propos',
    title: 'À propos et contact · SpotFinder',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: '**',
    title: 'Page introuvable · SpotFinder',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
