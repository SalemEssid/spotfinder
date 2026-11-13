import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideStar } from '@lucide/angular';

/**
 * 1–5 stars, usable in a Reactive Form like any input (`formControlName="ratingWifi"`).
 * Built on real radio buttons: arrow keys work, and screen readers say "4 sur 5".
 */
@Component({
  selector: 'app-star-rating',
  imports: [LucideStar],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarRatingComponent), multi: true }],
  template: `
    <fieldset class="stars" [disabled]="disabled()" (focusout)="onTouched()">
      <legend class="stars__legend">{{ label() }}</legend>
      <div class="stars__row" (mouseleave)="hovered.set(null)">
        @for (star of stars; track star) {
          <label class="star" [class.is-on]="star <= (hovered() ?? value() ?? 0)" (mouseenter)="hovered.set(star)">
            <input
              type="radio"
              [name]="name()"
              [value]="star"
              [checked]="value() === star"
              (change)="select(star)"
            />
            <svg lucideStar aria-hidden="true"></svg>
            <span class="visually-hidden">{{ star }} sur 5</span>
          </label>
        }
        <span class="stars__value" aria-hidden="true">{{ value() ? value() + '/5' : '' }}</span>
      </div>
    </fieldset>
  `,
  styles: `
    .stars {
      margin: 0;
      padding: 0;
      border: none;
    }

    .stars__legend {
      margin-bottom: 0.25rem;
      padding: 0;
      font-weight: 500;
    }

    .stars__row {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .star {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      color: var(--bordure);
      cursor: pointer;
      transition:
        color var(--duration),
        transform var(--duration) var(--ease-out);

      input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      &:has(input:focus-visible) {
        box-shadow: var(--focus-ring);
      }

      &.is-on {
        color: var(--orange);

        svg {
          fill: currentcolor;
        }
      }

      &:hover {
        transform: scale(1.12);
      }
    }

    .stars__value {
      margin-left: var(--space-2);
      font-weight: 700;
      min-width: 2.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  /** Radio group name: must be unique in the page. */
  readonly name = input.required<string>();

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly value = signal<number | null>(null);
  protected readonly hovered = signal<number | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: number) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: number | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected select(star: number): void {
    this.value.set(star);
    this.onChange(star);
  }
}
