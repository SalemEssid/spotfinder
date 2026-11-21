import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideCompass, LucideHeart, LucideHouse, LucideUser } from '@lucide/angular';
import { AuthService } from '../../services/auth.service';

/** Bottom tab bar on phones (mockup "Barre de navigation mobile"): Accueil · Explorer · Favoris · Profil. */
@Component({
  selector: 'app-mobile-nav',
  imports: [RouterLink, RouterLinkActive, LucideHouse, LucideCompass, LucideHeart, LucideUser],
  template: `
    <nav class="tabs" aria-label="Navigation mobile">
      <a
        routerLink="/"
        routerLinkActive="is-active"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
      >
        <svg lucideHouse></svg><span>Accueil</span>
      </a>
      <a routerLink="/explorer" routerLinkActive="is-active" ariaCurrentWhenActive="page">
        <svg lucideCompass></svg><span>Explorer</span>
      </a>
      <a routerLink="/compte/favoris" routerLinkActive="is-active" ariaCurrentWhenActive="page">
        <svg lucideHeart></svg><span>Favoris</span>
      </a>
      <a
        [routerLink]="auth.isLoggedIn() ? '/compte/profil' : '/connexion'"
        routerLinkActive="is-active"
        ariaCurrentWhenActive="page"
      >
        <svg lucideUser></svg><span>Profil</span>
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: none;
    }

    @media (max-width: 767px) {
      :host {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 900;
        display: block;
      }
    }

    .tabs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      height: var(--mobile-nav-h);
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--surface);
      border-top: 1px solid var(--bordure);
    }

    a {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      color: var(--texte-2);
      font-size: var(--fs-legende);
      font-weight: 500;
      text-decoration: none;

      &.is-active {
        color: var(--vert-canard);
        font-weight: 700;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNavComponent {
  protected readonly auth = inject(AuthService);
}
