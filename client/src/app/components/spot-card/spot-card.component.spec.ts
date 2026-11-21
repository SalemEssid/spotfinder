import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SpotSummary } from '../../models/spot.model';
import { makeMeter, makeSpot } from '../../testing/fixtures';
import { SpotCardComponent } from './spot-card.component';

async function render(spot: SpotSummary) {
  TestBed.configureTestingModule({ imports: [SpotCardComponent], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(SpotCardComponent);
  fixture.componentRef.setInput('spot', spot);
  await fixture.whenStable();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('SpotCardComponent', () => {
  it('shows the name, the distance from SUP’COM and the opening time', async () => {
    const { element } = await render(makeSpot());
    expect(element.querySelector('h3')?.textContent).toContain('Café Le Pupitre');
    expect(element.textContent).toContain('350 m de SUP’COM');
    expect(element.textContent).toContain('Ouvert jusqu’à 22:00');
  });

  it('links the title to the place page', async () => {
    const { element } = await render(makeSpot({ id: 7 }));
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/lieux/7');
  });

  it('always pairs the crowd colour with a word', async () => {
    const { element } = await render(
      makeSpot({ liveMeter: makeMeter({ occupancy: 85, level: 'sature' }) }),
    );
    const badge = element.querySelector('.badge--sature');
    expect(badge?.textContent?.trim()).toBe('≈ 85 % · Saturé');
  });

  it('says when there is no report instead of showing a colour', async () => {
    const { element } = await render(
      makeSpot({
        liveMeter: makeMeter({ source: 'aucun', occupancy: null, level: null, reportCount: 0 }),
      }),
    );
    expect(element.textContent).toContain('Pas de signalement');
    expect(element.querySelector('.badge--calme, .badge--modere, .badge--sature')).toBeNull();
  });

  it('shows community Wi-Fi rating, or the equipment when nobody rated it', async () => {
    const rated = await render(makeSpot());
    expect(rated.element.textContent).toContain('Wi-Fi 4/5');

    TestBed.resetTestingModule();
    const unrated = await render(
      makeSpot({
        ratings: { wifi: null, calm: null, outlets: null, price: null, count: 0 },
        equipment: { ...makeSpot().equipment, wifiSpeed: 8, outletsCount: 0 },
      }),
    );
    expect(unrated.element.textContent).toContain('Wi-Fi lent');
    expect(unrated.element.textContent).toContain('Prises : non');
  });

  it('marks places waiting for verification and closed places', async () => {
    const { element } = await render(
      makeSpot({ status: 'a_verifier', openNow: false, closesAt: null }),
    );
    expect(element.textContent).toContain('À vérifier');
    expect(element.textContent).toContain('Fermé');
  });

  it('emits its id on hover and null when the pointer leaves (map highlight)', async () => {
    const { fixture, element } = await render(makeSpot({ id: 3 }));
    const emitted: (number | null)[] = [];
    fixture.componentInstance.highlight.subscribe((id) => emitted.push(id));

    const card = element.querySelector('article')!;
    card.dispatchEvent(new MouseEvent('mouseenter'));
    card.dispatchEvent(new MouseEvent('mouseleave'));
    expect(emitted).toEqual([3, null]);
  });
});
