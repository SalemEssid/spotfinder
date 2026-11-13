import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  HourlyProfile,
  LiveMeter,
  NewSpot,
  ReportChoice,
  ReportResult,
  SpotDetail,
  SpotSummary,
} from '../models/spot.model';
import type { NewReview, Review } from '../models/user.model';
import { filtersToParams, type SpotFilters } from '../utils/filters';
import { REFERENCE_POINT, type GeoPoint } from '../utils/reference-point';

/** HTTP calls about places, their Live Meter and their reviews. */
@Injectable({ providedIn: 'root' })
export class SpotService {
  private readonly http = inject(HttpClient);

  /** The API accepts the same French params as the Explorer URL, plus the reference point. */
  list(filters: SpotFilters, origin: GeoPoint = REFERENCE_POINT): Observable<SpotSummary[]> {
    const params = new HttpParams({ fromObject: { ...filtersToParams(filters), ...originParams(origin) } });
    return this.http.get<SpotSummary[]>('/api/spots', { params });
  }

  get(id: number, origin: GeoPoint = REFERENCE_POINT): Observable<SpotDetail> {
    return this.http.get<SpotDetail>(`/api/spots/${id}`, { params: originParams(origin) });
  }

  create(spot: NewSpot): Observable<SpotDetail> {
    return this.http.post<SpotDetail>('/api/spots', spot);
  }

  liveMeter(id: number): Observable<LiveMeter> {
    return this.http.get<LiveMeter>(`/api/spots/${id}/live`);
  }

  hourlyProfile(id: number): Observable<HourlyProfile> {
    return this.http.get<HourlyProfile>(`/api/spots/${id}/live/hourly`);
  }

  /** "Je suis ici". */
  report(id: number, level: ReportChoice): Observable<ReportResult> {
    return this.http.post<ReportResult>(`/api/spots/${id}/live-reports`, { level });
  }

  reviews(id: number): Observable<Review[]> {
    return this.http.get<Review[]>(`/api/spots/${id}/reviews`);
  }

  createReview(id: number, review: NewReview): Observable<Review> {
    return this.http.post<Review>(`/api/spots/${id}/reviews`, review);
  }
}

function originParams(origin: GeoPoint): Record<string, string> {
  return { lat: origin.latitude.toFixed(5), lng: origin.longitude.toFixed(5) };
}
