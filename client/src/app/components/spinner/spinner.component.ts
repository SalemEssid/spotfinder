import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Small loading spinner, sized with the text around it (1em). Used in buttons while a form is
 * being sent; the button text says what is happening ("Envoi…"), so the spinner itself is hidden
 * from screen readers.
 */
@Component({
  selector: 'app-spinner',
  template: '',
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: 1em;
      height: 1em;
      border: 2px solid currentcolor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerComponent {}
