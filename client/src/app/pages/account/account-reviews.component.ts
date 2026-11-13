import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-account-reviews',
  template: `
    <section class="container page">
      <h1>Mes avis</h1>
      <p class="text-secondary">Phase 4.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountReviewsComponent {}
