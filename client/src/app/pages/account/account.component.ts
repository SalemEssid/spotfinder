import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideHeart, LucideMessageSquare, LucideUser } from '@lucide/angular';
import { AuthService } from '../../services/auth.service';
import { initials } from '../../utils/format';

/** "Espace membre": a header with the member, three tabs, and the selected tab below. */
@Component({
  selector: 'app-account',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, LucideUser, LucideHeart, LucideMessageSquare],
  template: `
    <div class="container page account">
      @if (auth.user(); as user) {
        <header class="account__header">
          <span class="account__avatar" aria-hidden="true">{{ userInitials() }}</span>
          <div>
            <h1>Bonjour {{ user.name }}</h1>
            <p class="text-secondary">Membre depuis {{ user.createdAt | date: 'MMMM y' }}</p>
          </div>
        </header>
      }

      <nav class="tabs" aria-label="Espace membre">
        <a routerLink="profil" routerLinkActive="is-active" ariaCurrentWhenActive="page">
          <svg lucideUser aria-hidden="true"></svg> Profil
        </a>
        <a routerLink="favoris" routerLinkActive="is-active" ariaCurrentWhenActive="page">
          <svg lucideHeart aria-hidden="true"></svg> Favoris
        </a>
        <a routerLink="avis" routerLinkActive="is-active" ariaCurrentWhenActive="page">
          <svg lucideMessageSquare aria-hidden="true"></svg> Mes avis
        </a>
      </nav>

      <router-outlet />
    </div>
  `,
  styles: `
    .account {
      display: grid;
      gap: var(--space-5);
    }

    .account__header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .account__avatar {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--vert-canard);
      color: var(--texte-inverse);
      font-family: var(--font-titre);
      font-size: 1.5rem;
      font-weight: 700;
    }

    .tabs {
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      border-bottom: 1px solid var(--bordure);

      a {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        min-height: 48px;
        padding: 0 var(--space-4);
        border-bottom: 3px solid transparent;
        color: var(--texte-2);
        font-weight: 500;
        text-decoration: none;
        white-space: nowrap;

        &:hover {
          color: var(--encre);
        }

        &.is-active {
          border-bottom-color: var(--vert-canard);
          color: var(--encre);
          font-weight: 700;
        }
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent {
  protected readonly auth = inject(AuthService);
  protected readonly userInitials = computed(() => initials(this.auth.user()?.name ?? ''));
}
