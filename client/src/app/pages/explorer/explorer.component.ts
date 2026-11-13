import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-explorer',
  template: `
    <section class="container page">
      <h1>Explorer</h1>
      <p class="text-secondary">Liste, carte et filtres (phase 2).</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerComponent {}
