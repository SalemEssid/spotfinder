import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-account-profile',
  template: `
    <section class="container page">
      <h1>Mon profil</h1>
      <p class="text-secondary">Phase 4.</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProfileComponent {}
