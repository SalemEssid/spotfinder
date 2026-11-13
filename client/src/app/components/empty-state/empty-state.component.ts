import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpotIllustrationComponent } from '../spot-illustration/spot-illustration.component';

/** Friendly "nothing here" / "something went wrong" block. Actions are projected inside. */
@Component({
  selector: 'app-empty-state',
  imports: [SpotIllustrationComponent],
  template: `
    <div class="empty" [class.empty--error]="tone() === 'error'">
      <app-spot-illustration class="empty__illustration" [type]="tone() === 'error' ? 'autre' : 'bibliotheque'" />
      <h2 class="empty__title">{{ title() }}</h2>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <div class="empty__actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      justify-items: center;
      gap: var(--space-3);
      padding: var(--space-6) var(--space-4);
      text-align: center;
    }

    .empty__illustration {
      width: 132px;
      height: 100px;
      border-radius: var(--radius-md);
    }

    .empty--error .empty__illustration {
      background: var(--sature-bg);
    }

    .empty__title {
      font-size: 1.25rem;
    }

    .empty__message {
      max-width: 44ch;
      color: var(--texte-2);
    }

    .empty__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly tone = input<'empty' | 'error'>('empty');
}
