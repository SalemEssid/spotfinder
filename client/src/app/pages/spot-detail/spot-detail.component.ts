import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-spot-detail',
  template: `
    <section class="container page">
      <h1>Fiche du lieu</h1>
      <p class="text-secondary">Détails, Live Meter et avis (phase 3).</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotDetailComponent {}
