import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-register',
  template: `
    <section class="container page">
      <h1>Inscription</h1>
      <p class="text-secondary">Phase 4.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {}
