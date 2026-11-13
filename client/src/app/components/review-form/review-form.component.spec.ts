import { TestBed } from '@angular/core/testing';
import type { NewReview } from '../../models/user.model';
import { ReviewFormComponent } from './review-form.component';

async function render() {
  TestBed.configureTestingModule({ imports: [ReviewFormComponent] });
  const fixture = TestBed.createComponent(ReviewFormComponent);
  const submitted: NewReview[] = [];
  fixture.componentInstance.submitReview.subscribe((review) => submitted.push(review));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const submit = async () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  const rate = (name: string, value: number) =>
    element.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!.click();
  return { fixture, element, submitted, submit, rate };
}

describe('ReviewFormComponent', () => {
  it('asks for the 4 ratings before sending', async () => {
    const { element, submitted, submit, rate } = await render();
    rate('rating-wifi', 4);
    await submit();
    expect(submitted).toEqual([]);
    expect(element.textContent).toContain('Donnez une note aux 4 critères.');
  });

  it('emits the ratings and the trimmed comment', async () => {
    const { fixture, element, submitted, submit, rate } = await render();
    rate('rating-wifi', 4);
    rate('rating-calm', 5);
    rate('rating-outlets', 3);
    rate('rating-price', 2);
    const comment = element.querySelector('textarea')!;
    comment.value = '  Très calme le matin.  ';
    comment.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.textContent).toContain('476 caractères restants');

    await submit();
    expect(submitted).toEqual([
      { ratingWifi: 4, ratingCalm: 5, ratingOutlets: 3, ratingPrice: 2, comment: 'Très calme le matin.' },
    ]);
  });
});
