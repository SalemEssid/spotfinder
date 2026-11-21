import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FORM_FIELD } from './form-field.component';

/** A tiny host page using the field like the real forms do. */
@Component({
  imports: [FORM_FIELD],
  template: `
    <app-form-field
      label="Adresse e-mail"
      controlId="email"
      hint="Jamais affichée."
      [error]="error()"
    >
      <input appFieldControl type="email" />
    </app-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly error = signal<string | null>(null);
}

async function render() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, input: element.querySelector('input')! };
}

describe('FormFieldComponent + appFieldControl', () => {
  it('links the label to the control', async () => {
    const { element, input } = await render();
    expect(input.id).toBe('email');
    expect(element.querySelector('label')!.getAttribute('for')).toBe('email');
  });

  it('describes the control with its hint', async () => {
    const { element, input } = await render();
    expect(input.getAttribute('aria-describedby')).toBe('email-hint');
    expect(element.querySelector('#email-hint')!.textContent).toBe('Jamais affichée.');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the error, marks the control invalid and announces the error with it', async () => {
    const { fixture, element, input } = await render();
    fixture.componentInstance.error.set('Adresse e-mail invalide.');
    await fixture.whenStable();

    expect(element.querySelector('#email-error')!.textContent).toBe('Adresse e-mail invalide.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-hint email-error');
  });
});
