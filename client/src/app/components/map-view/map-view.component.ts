import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import type { LiveMeter } from '../../models/spot.model';
import { ClockService } from '../../services/clock.service';
import { crowdBadgeText, isFreshReport } from '../../utils/live-meter';
import { loadStylesheet } from '../../utils/load-stylesheet';
import { REFERENCE_POINT, type GeoPoint } from '../../utils/reference-point';

export interface MapMarker {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  liveMeter: LiveMeter;
}

/** Pin shape from the style guide ("Repère carte"), 40 × 52. */
const PIN_PATH =
  'M20 0C9 0 0 8.6 0 19.3 0 33.8 18 50.5 18.8 51.2a1.8 1.8 0 0 0 2.4 0C22 50.5 40 33.8 40 19.3 40 8.6 31 0 20 0Z';

/**
 * Inside the pin, 1, 2 or 3 bars (Calme / Modéré / Saturé): the crowd level is readable
 * without the colour, even when the text labels are hidden at low zoom.
 */
function pinSvg(level: LiveMeter['level']): string {
  const filledBars = level === 'sature' ? 3 : level === 'modere' ? 2 : level === 'calme' ? 1 : 0;
  const inner =
    filledBars === 0
      ? '<circle class="sf-pin__dot" cx="20" cy="19" r="7"/>'
      : [0, 1, 2]
          .map((i) => {
            const height = 6 + i * 4;
            const opacity = i < filledBars ? 1 : 0.35;
            return `<rect class="sf-pin__dot" x="${12 + i * 6}" y="${25 - height}" width="4" height="${height}" rx="1.5" fill-opacity="${opacity}"/>`;
          })
          .join('');
  return `<svg class="sf-pin__shape" viewBox="0 0 40 52" aria-hidden="true"><path class="sf-pin__body" d="${PIN_PATH}"/>${inner}</svg>`;
}

/** Below this zoom level, pins are too close for their text labels: only the bars remain. */
const LABELS_MIN_ZOOM = 13;

/** Leaflet + pin styles, built separately (angular.json "map" bundle) and loaded on demand. */
const MAP_STYLESHEET = 'map.css';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/**
 * Leaflet map wrapped in one component, so no other part of the app touches Leaflet directly.
 * Used by the Explorer (many pins), the place page (one pin) and "Ajouter un lieu" (pick mode).
 */
@Component({
  selector: 'app-map-view',
  template: `<div #mapContainer class="map" role="region" [attr.aria-label]="ariaLabel()"></div>`,
  styles: `
    :host {
      display: block;
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: var(--map-fond);
    }

    .map {
      width: 100%;
      height: 100%;
      min-height: 220px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent {
  readonly markers = input<MapMarker[]>([]);
  readonly highlightedId = input<number | null>(null);
  /** Pick mode: a click on the map moves the pin and emits `positionPick`. */
  readonly pickable = input(false);
  readonly picked = input<GeoPoint | null>(null);
  readonly center = input<GeoPoint>(REFERENCE_POINT);
  readonly zoom = input(13);
  /** Re-frame the map around the markers whenever they change. */
  readonly fitToMarkers = input(true);
  readonly showReference = input(true);
  readonly ariaLabel = input('Carte des lieux');

  readonly markerHover = output<number | null>();
  readonly markerSelect = output<number>();
  readonly positionPick = output<GeoPoint>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private readonly clock = inject(ClockService);
  private readonly ready = signal(false);
  private map?: L.Map;
  private readonly markerLayer = L.layerGroup();
  private readonly markerById = new Map<number, L.Marker>();
  private pickedMarker?: L.Marker;

  constructor() {
    let destroyed = false;
    let resizeObserver: ResizeObserver | undefined;
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      resizeObserver?.disconnect();
      this.map?.remove();
    });

    // Leaflet needs a real DOM element with a size: create the map after the first render,
    // once the map styles are loaded (a map drawn without them is a jumble of tiles).
    afterNextRender(() => {
      void loadStylesheet(MAP_STYLESHEET)
        .catch(() => undefined) // without the styles the map looks rough, but it still works
        .then(() => {
          if (destroyed) return;
          this.createMap();
          // The map can be hidden (phones: "Liste" view) when the places arrive. A hidden map has
          // no size, so framing the pins then gives a whole-world view: re-frame when it appears.
          let wasHidden = this.container().nativeElement.offsetWidth === 0;
          resizeObserver = new ResizeObserver(([entry]) => {
            this.map?.invalidateSize();
            const isHidden = (entry?.contentRect.width ?? 0) === 0;
            if (wasHidden && !isHidden) this.fitBounds(this.markers());
            wasHidden = isHidden;
          });
          resizeObserver.observe(this.container().nativeElement);
        });
    });

    // Re-draw the pins when the list of places changes.
    effect(() => {
      const markers = this.markers();
      if (this.ready()) this.renderMarkers(markers);
    });

    // Highlight follows the hovered card (and the other way round, via markerHover).
    effect(() => {
      const highlightedId = this.highlightedId();
      if (!this.ready()) return;
      for (const [id, marker] of this.markerById) {
        const isHighlighted = id === highlightedId;
        marker
          .getElement()
          ?.querySelector('.sf-pin')
          ?.classList.toggle('is-highlighted', isHighlighted);
        marker.setZIndexOffset(isHighlighted ? 1000 : 0);
      }
    });

    effect(() => {
      const position = this.picked();
      if (this.ready()) this.renderPickedMarker(position);
    });
  }

  /** Centre of the visible map: "Placer le lieu au centre" for keyboard users in pick mode. */
  getCenter(): GeoPoint | null {
    const center = this.map?.getCenter();
    return center ? { latitude: center.lat, longitude: center.lng } : null;
  }

  private createMap(): void {
    const center = this.picked() ?? this.center();
    this.map = L.map(this.container().nativeElement, {
      center: [center.latitude, center.longitude],
      zoom: this.zoom(),
      zoomControl: true,
      scrollWheelZoom: true,
    });
    // OpenStreetMap tiles: free, no API key. The attribution is required by their licence.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.markerLayer.addTo(this.map);

    const updateLabelVisibility = () =>
      this.container().nativeElement.classList.toggle(
        'sf-map--compact',
        this.map!.getZoom() < LABELS_MIN_ZOOM,
      );
    this.map.on('zoomend', updateLabelVisibility);
    updateLabelVisibility();

    if (this.showReference()) {
      L.marker([REFERENCE_POINT.latitude, REFERENCE_POINT.longitude], {
        icon: L.divIcon({ className: 'sf-reference', iconSize: [44, 44], iconAnchor: [22, 22] }),
        keyboard: false,
        interactive: false,
      })
        .bindTooltip(REFERENCE_POINT.label, {
          permanent: true,
          direction: 'bottom',
          offset: [0, 16],
          className: 'sf-reference-label',
        })
        .addTo(this.map);
    }

    if (this.pickable()) {
      this.map.on('click', (event: L.LeafletMouseEvent) =>
        this.positionPick.emit({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
      );
    }
    this.ready.set(true);
  }

  private renderMarkers(markers: MapMarker[]): void {
    this.markerLayer.clearLayers();
    this.markerById.clear();
    const now = this.clock.now();

    for (const spot of markers) {
      const label = crowdBadgeText(spot.liveMeter);
      const classes = [
        'sf-pin',
        `sf-pin--${spot.liveMeter.level ?? 'aucun'}`,
        spot.liveMeter.source === 'habituel' ? 'sf-pin--habituel' : '',
        isFreshReport(spot.liveMeter, now) ? 'is-fresh' : '',
        spot.id === this.highlightedId() ? 'is-highlighted' : '',
      ].join(' ');

      const marker = L.marker([spot.latitude, spot.longitude], {
        icon: L.divIcon({
          className: 'sf-marker',
          html: `<div class="${classes}">${pinSvg(spot.liveMeter.level)}<span class="sf-pin__label">${escapeHtml(label)}</span></div>`,
          iconSize: [40, 52],
          iconAnchor: [20, 52], // the tip of the pin points at the place
        }),
        keyboard: true, // focusable with Tab, Enter = click
        riseOnHover: true,
      });
      marker.on('click', () => this.markerSelect.emit(spot.id));
      marker.on('mouseover', () => this.markerHover.emit(spot.id));
      marker.on('mouseout', () => this.markerHover.emit(null));
      marker.addTo(this.markerLayer);

      // Accessible name for screen readers ("Café Le Pupitre, ≈ 30 % · Calme").
      const element = marker.getElement();
      element?.setAttribute('aria-label', `${spot.name}, ${label}`);
      element?.addEventListener('focus', () => this.markerHover.emit(spot.id));
      element?.addEventListener('blur', () => this.markerHover.emit(null));
      this.markerById.set(spot.id, marker);
    }

    this.fitBounds(markers);
  }

  /** Frames the pins (and the reference point). Skipped while the map is hidden: it has no size. */
  private fitBounds(markers: MapMarker[]): void {
    if (!this.map || !this.fitToMarkers() || markers.length === 0) return;
    if (this.container().nativeElement.offsetWidth === 0) return;
    const points: L.LatLngExpression[] = markers.map((m) => [m.latitude, m.longitude]);
    if (this.showReference()) points.push([REFERENCE_POINT.latitude, REFERENCE_POINT.longitude]);
    this.map.fitBounds(L.latLngBounds(points).pad(0.12), { maxZoom: 15, animate: false });
  }

  private renderPickedMarker(position: GeoPoint | null): void {
    if (!this.map) return;
    if (!position) {
      this.pickedMarker?.remove();
      this.pickedMarker = undefined;
      return;
    }
    const latLng: L.LatLngExpression = [position.latitude, position.longitude];
    if (!this.pickedMarker) {
      this.pickedMarker = L.marker(latLng, {
        icon: L.divIcon({
          className: 'sf-marker',
          html: `<div class="sf-pin sf-pin--calme is-highlighted">${pinSvg(null)}</div>`,
          iconSize: [40, 52],
          iconAnchor: [20, 52],
        }),
        draggable: true,
        keyboard: false,
      }).addTo(this.map);
      this.pickedMarker.on('dragend', () => {
        const { lat, lng } = this.pickedMarker!.getLatLng();
        this.positionPick.emit({ latitude: lat, longitude: lng });
      });
    } else {
      this.pickedMarker.setLatLng(latLng);
    }
  }
}
