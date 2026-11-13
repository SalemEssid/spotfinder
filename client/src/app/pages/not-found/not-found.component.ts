import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpotIllustrationComponent } from '../../components/spot-illustration/spot-illustration.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, SpotIllustrationComponent],
  template: `
    <section class="container page not-found" aria-labelledby="not-found-title">
      <app-spot-illustration class="not-found__illustration" type="autre" />
      <p class="code" aria-hidden="true">404</p>
      <h1 id="not-found-title">Cette page a quitté son bureau</h1>
      <p class="text-secondary">Le lien est peut-être incomplet. Pas grave : il reste plein de places libres ailleurs.</p>
      <div class="actions">
        <a class="btn btn--primary" routerLink="/explorer">Trouver un lieu</a>
        <a class="btn btn--ghost" routerLink="/">Retour à l’accueil</a>
      </div>
    </section>
  `,
  styles: `
    .not-found {
      display: grid;
      justify-items: center;
      gap: var(--space-3);
      text-align: center;
    }

    .not-found__illustration {
      width: 220px;
      height: 160px;
      border-radius: var(--radius-lg);
    }

    .code {
      font-family: var(--font-titre);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--orange-texte);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
