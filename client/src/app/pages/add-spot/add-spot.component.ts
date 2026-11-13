import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-add-spot',
  template: `
    <section class="container page">
      <h1>Ajouter un lieu</h1>
      <p class="text-secondary">Formulaire et carte (phase 5).</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddSpotComponent {}
