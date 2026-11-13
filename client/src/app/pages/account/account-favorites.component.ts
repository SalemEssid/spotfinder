import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-account-favorites',
  template: `
    <section class="container page">
      <h1>Mes favoris</h1>
      <p class="text-secondary">Phase 4.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFavoritesComponent {}
