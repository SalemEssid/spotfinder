import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: `
    <section class="container page">
      <h1>Page introuvable</h1>
      <p class="text-secondary">Cette page n’existe pas.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
