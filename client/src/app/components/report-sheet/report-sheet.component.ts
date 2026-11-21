import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { ReportChoice } from '../../models/spot.model';
import { REPORT_CHOICES } from '../../utils/live-meter';

/**
 * "Il y a du monde ici ?" (mockup "Signaler l'affluence").
 * A native <dialog>: the browser handles focus trapping, Esc to close and the backdrop.
 * Phones: slides up from the bottom (bottom sheet). Desktop: centred dialog.
 */
@Component({
  selector: 'app-report-sheet',
  templateUrl: './report-sheet.component.html',
  styleUrl: './report-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportSheetComponent {
  readonly open = input(false);
  readonly spotName = input('');
  readonly submitChoice = output<ReportChoice>();
  readonly closed = output<void>();

  protected readonly choices = REPORT_CHOICES;
  protected readonly choice = signal<ReportChoice | null>(null);
  protected readonly selectedHint = computed(
    () => this.choices.find((c) => c.value === this.choice())?.hint ?? '',
  );
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        this.choice.set(null);
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const choice = this.choice();
    if (choice) this.submitChoice.emit(choice);
  }

  protected close(): void {
    this.dialog().nativeElement.close(); // fires the "close" event → closed.emit()
  }

  /** A click on the dark backdrop (outside the sheet) closes it. */
  protected onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }
}
