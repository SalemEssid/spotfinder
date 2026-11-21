import { TestBed } from '@angular/core/testing';
import type { LiveMeter } from '../../models/spot.model';
import { ClockService } from '../../services/clock.service';
import { makeMeter } from '../../testing/fixtures';
import { LiveMeterComponent } from './live-meter.component';

/** A clock frozen at a known time, so "il y a 10 min" is predictable. */
const NOW = new Date('2026-11-12T14:00:00Z'); // Thursday 15:00 in Tunis
const frozenClock = { now: () => NOW, tick: () => undefined };

async function render(meter: LiveMeter) {
  TestBed.configureTestingModule({
    imports: [LiveMeterComponent],
    providers: [{ provide: ClockService, useValue: frozenClock }],
  });
  const fixture = TestBed.createComponent(LiveMeterComponent);
  fixture.componentRef.setInput('meter', meter);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const text = (selector: string) =>
    element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  return { fixture, element, text };
}

describe('LiveMeterComponent', () => {
  it('shows the estimate with its word and its source (brief example: ≈ 47 % · Modéré)', async () => {
    const { text } = await render(
      makeMeter({
        occupancy: 47,
        level: 'modere',
        reportCount: 3,
        lastReportAt: '2026-11-12T13:50:00Z',
      }),
    );
    expect(text('.meter__title')).toBe('Affluence maintenant');
    // "≈" is shown, "environ" is read by screen readers.
    expect(text('.meter__value')).toMatch(/^≈\s*environ 47 % · Modéré$/);
    expect(text('.meter__source')).toBe('3 signalements · il y a 10 min');
  });

  it('exposes the value to assistive technologies as a meter', async () => {
    const { element } = await render(makeMeter({ occupancy: 85, level: 'sature' }));
    const bar = element.querySelector('[role="meter"]')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('85');
    expect(bar.getAttribute('aria-valuetext')).toBe('environ 85 %, Saturé');
  });

  it('uses the level colour class (always together with the word)', async () => {
    const { element, text } = await render(makeMeter({ occupancy: 85, level: 'sature' }));
    expect(element.querySelector('.meter--sature')).not.toBeNull();
    expect(text('.meter__value')).toContain('Saturé');
  });

  it('labels the historical fallback "Estimation habituelle"', async () => {
    const { text } = await render(
      makeMeter({
        source: 'habituel',
        occupancy: 28,
        level: 'calme',
        reportCount: 12,
        lastReportAt: null,
        confidence: null,
      }),
    );
    expect(text('.meter__title')).toBe('Affluence habituelle à cette heure');
    expect(text('.meter__source')).toBe(
      'Estimation habituelle · 12 signalements passés le jeudi vers 15 h',
    );
  });

  it('says "Pas encore de signalement" when there is no data at all', async () => {
    const { element, text } = await render(
      makeMeter({
        source: 'aucun',
        occupancy: null,
        level: null,
        reportCount: 0,
        lastReportAt: null,
        confidence: null,
      }),
    );
    expect(text('.meter__value')).toBe('Pas encore de signalement');
    expect(element.querySelector('[role="meter"]')).toBeNull();
  });

  it('tells how much to trust a single old report', async () => {
    const { text } = await render(makeMeter({ confidence: 'faible', reportCount: 1 }));
    expect(text('.meter__confidence')).toBe('Fiabilité faible : peu de signalements récents');
    expect(text('.meter__source')).toMatch(/^1 signalement ·/);
  });

  it('updates the displayed value when a new estimate arrives', async () => {
    const { fixture, element } = await render(makeMeter({ occupancy: 30, level: 'calme' }));
    fixture.componentRef.setInput('meter', makeMeter({ occupancy: 64, level: 'modere' }));
    await fixture.whenStable();
    // In tests there is no animation frame loop worth waiting for: the bar width is the source of truth.
    expect((element.querySelector('.meter__fill') as HTMLElement).style.width).toBe('64%');
    expect(element.querySelector('.meter--modere')).not.toBeNull();
  });
});
