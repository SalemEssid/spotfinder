import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <section class="container page">
      <h1>Trouvez où travailler, maintenant.</h1>
      <p class="text-secondary">Page d’accueil (phase 5).</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
