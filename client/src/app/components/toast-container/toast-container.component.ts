import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideCircleCheck, LucideCircleExclamationPoint, LucideInfo, LucideX } from '@lucide/angular';
import { ToastService } from '../../services/toast.service';

/**
 * Where toasts appear. Two live regions so screen readers announce them:
 * "polite" for confirmations, "assertive" (role=alert) for errors.
 */
@Component({
  selector: 'app-toast-container',
  imports: [LucideCircleCheck, LucideCircleExclamationPoint, LucideInfo, LucideX],
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        @if (toast.kind !== 'error') {
          <div class="toast" [class]="'toast toast--' + toast.kind" animate.enter="toast-enter">
            @if (toast.kind === 'success') {
              <svg lucideCircleCheck></svg>
            } @else {
              <svg lucideInfo></svg>
            }
            <p>{{ toast.message }}</p>
            <button type="button" class="toast__close" (click)="toasts.dismiss(toast.id)">
              <svg lucideX [size]="18"></svg><span class="visually-hidden">Fermer</span>
            </button>
          </div>
        }
      }
    </div>
    <div class="toasts toasts--errors" role="alert">
      @for (toast of toasts.toasts(); track toast.id) {
        @if (toast.kind === 'error') {
          <div class="toast toast--error" animate.enter="toast-enter">
            <svg lucideCircleExclamationPoint></svg>
            <p>{{ toast.message }}</p>
            <button type="button" class="toast__close" (click)="toasts.dismiss(toast.id)">
              <svg lucideX [size]="18"></svg><span class="visually-hidden">Fermer</span>
            </button>
          </div>
        }
      }
    </div>
  `,
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}
