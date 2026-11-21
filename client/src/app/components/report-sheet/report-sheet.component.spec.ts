import { TestBed } from '@angular/core/testing';
import type { ReportChoice } from '../../models/spot.model';
import { ReportSheetComponent } from './report-sheet.component';

// jsdom does not implement <dialog> methods: give it the minimum we need.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

async function render() {
  TestBed.configureTestingModule({ imports: [ReportSheetComponent] });
  const fixture = TestBed.createComponent(ReportSheetComponent);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('spotName', 'Café Le Pupitre');
  const submitted: ReportChoice[] = [];
  let closed = 0;
  fixture.componentInstance.submitChoice.subscribe((choice) => submitted.push(choice));
  fixture.componentInstance.closed.subscribe(() => closed++);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, submitted, closedCount: () => closed };
}

describe('ReportSheetComponent', () => {
  it('opens with the three choices of the brief', async () => {
    const { element } = await render();
    expect(element.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    const labels = [...element.querySelectorAll('.choice')].map((c) => c.textContent?.trim());
    expect(labels).toEqual(['Calme', 'Moyen', 'Saturé']);
  });

  it('cannot be sent before a choice is made', async () => {
    const { element } = await render();
    const send = [...element.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Envoyer'),
    )!;
    expect(send.disabled).toBe(true);
  });

  it('emits the chosen level', async () => {
    const { fixture, element, submitted } = await render();
    const moyen = element.querySelector<HTMLInputElement>('input[value="moyen"]')!;
    moyen.click();
    await fixture.whenStable();
    expect(element.querySelector('.sheet__hint')?.textContent).toContain('Quelques places libres');

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    expect(submitted).toEqual(['moyen']);
  });

  it('reports when it is closed (Annuler)', async () => {
    const { element, closedCount } = await render();
    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Annuler'))!
      .click();
    expect(closedCount()).toBe(1);
  });
});
