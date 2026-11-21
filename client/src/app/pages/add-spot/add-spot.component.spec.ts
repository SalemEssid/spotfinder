import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import type { NewSpot } from '../../models/spot.model';
import { makeSpotDetail } from '../../testing/fixtures';
import { AddSpotComponent } from './add-spot.component';

/** Access to the protected members the template uses (tests drive the form logic directly). */
interface AddSpotInternals {
  form: FormGroup;
  days: unknown[];
  setPosition(point: { latitude: number; longitude: number }): void;
  addSlot(day: unknown): void;
  copyMondayToAll(): void;
  submit(): void;
}

describe('AddSpotComponent (dynamic form)', () => {
  let component: AddSpotInternals;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AddSpotComponent],
      // Catch-all route: after saving, the page navigates to the new place (/lieux/:id).
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
    // The map needs a real browser: replace the template, keep the form logic.
    TestBed.overrideComponent(AddSpotComponent, { set: { template: '', imports: [] } });
    const fixture = TestBed.createComponent(AddSpotComponent);
    component = fixture.componentInstance as unknown as AddSpotInternals;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function fillRequiredFields(): void {
    component.form.patchValue({
      name: 'Café du Test',
      area: 'Ariana',
      address: '12 avenue de la Liberté',
    });
  }

  it('does not send anything while the place is not on the map', () => {
    fillRequiredFields();
    component.submit();
    http.expectNone('/api/spots');
  });

  it('sends split opening hours copied to the whole week, and the pin position', () => {
    fillRequiredFields();
    component.setPosition({ latitude: 36.86, longitude: 10.19 });

    const monday = component.days[0]!;
    component.addSlot(monday); // 08:00–20:00 + 14:00–18:00 by default → make them valid split hours
    component.form.patchValue({
      hours: [
        {
          open: true,
          slots: [
            { opensAt: '08:00', closesAt: '12:00' },
            { opensAt: '14:00', closesAt: '18:00' },
          ],
        },
      ],
    });
    component.copyMondayToAll();
    component.submit();

    const request = http.expectOne('/api/spots');
    const body = request.request.body as NewSpot;
    expect(body).toMatchObject({ name: 'Café du Test', latitude: 36.86, longitude: 10.19 });
    expect(body.openingHours).toHaveLength(14); // 7 days × 2 slots
    expect(body.openingHours.filter((slot) => slot.weekday === 0)).toEqual([
      { weekday: 0, opensAt: '08:00', closesAt: '12:00' },
      { weekday: 0, opensAt: '14:00', closesAt: '18:00' },
    ]);
    request.flush(makeSpotDetail({ id: 99 }));
  });

  it('refuses a slot that closes before it opens', () => {
    fillRequiredFields();
    component.setPosition({ latitude: 36.86, longitude: 10.19 });
    component.form.patchValue({
      hours: [{ open: true, slots: [{ opensAt: '18:00', closesAt: '09:00' }] }],
    });
    component.submit();
    http.expectNone('/api/spots');
  });
});
