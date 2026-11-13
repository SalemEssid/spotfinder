import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about',
  template: `
    <section class="container page">
      <h1>À propos</h1>
      <p class="text-secondary">Présentation et formulaire de contact (phase 5).</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {}
