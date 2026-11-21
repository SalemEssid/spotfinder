import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideHeart } from '@lucide/angular';
import { catchError, of } from 'rxjs';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { SpotCardComponent } from '../../components/spot-card/spot-card.component';
import type { SpotSummary } from '../../models/spot.model';
import { AccountService } from '../../services/account.service';
import { ToastService } from '../../services/toast.service';
import { apiErrorMessage } from '../../utils/api-error';

/** Journey 3: header → Espace membre → Favoris (2 clicks). */
@Component({
  selector: 'app-account-favorites',
  imports: [RouterLink, SpotCardComponent, EmptyStateComponent, LucideHeart],
  template: `
    <section class="favorites" aria-labelledby="favorites-title">
      <h2 id="favorites-title">Mes favoris</h2>

      @if (error()) {
        <app-empty-state
          tone="error"
          title="Vos favoris n’ont pas pu être chargés"
          [message]="error()!"
        />
      } @else if (favorites(); as list) {
        @if (list.length === 0) {
          <app-empty-state
            title="Pas encore de favori"
            message="Touchez « Ajouter aux favoris » sur la fiche d’un lieu pour le retrouver ici en deux clics."
          >
            <a class="btn btn--primary" routerLink="/explorer">Explorer les lieux</a>
          </app-empty-state>
        } @else {
          <p class="text-secondary">
            Leur affluence en ce moment, pour choisir où aller sans chercher.
          </p>
          <ul class="grid" role="list">
            @for (spot of list; track spot.id) {
              <li class="grid__item">
                <app-spot-card [spot]="spot" layout="grid" />
                <button type="button" class="btn btn--ghost remove" (click)="remove(spot)">
                  <svg lucideHeart aria-hidden="true"></svg>
                  Retirer<span class="visually-hidden"> {{ spot.name }} des favoris</span>
                </button>
              </li>
            }
          </ul>
        }
      } @else {
        <div class="grid">
          <div class="skeleton" style="height: 280px"></div>
          <div class="skeleton" style="height: 280px"></div>
        </div>
      }
    </section>
  `,
  styles: `
    .favorites {
      display: grid;
      gap: var(--space-4);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .grid__item {
      display: grid;
      gap: var(--space-2);
      align-content: start;
    }

    .remove {
      justify-self: start;

      svg {
        fill: currentcolor;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFavoritesComponent {
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);

  protected readonly favorites = signal<SpotSummary[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.account
      .favorites()
      .pipe(
        catchError((error: unknown) => {
          this.error.set(apiErrorMessage(error));
          return of(null);
        }),
        takeUntilDestroyed(),
      )
      .subscribe((list) => this.favorites.set(list));
  }

  /** Optimistic: the card disappears at once and comes back if the server refuses. */
  protected remove(spot: SpotSummary): void {
    const before = this.favorites();
    this.favorites.update((list) => list?.filter((s) => s.id !== spot.id) ?? null);
    this.account.removeFavorite(spot.id).subscribe({
      next: () => this.toast.success(`${spot.name} retiré des favoris.`),
      error: (error: unknown) => {
        this.favorites.set(before);
        this.toast.error(apiErrorMessage(error, 'Impossible de retirer ce favori.'));
      },
    });
  }
}
