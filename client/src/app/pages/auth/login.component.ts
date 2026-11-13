import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-login',
  template: `
    <section class="container page">
      <h1>Connexion</h1>
      <p class="text-secondary">Phase 4.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {}
