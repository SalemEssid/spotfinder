import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { SpotSummary } from '../models/spot.model';
import type { Profile, Review, User } from '../models/user.model';
import { REFERENCE_POINT } from '../utils/reference-point';

/** Espace membre: profile, favourites, my reviews (all under /api/me, session required). */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  profile(): Observable<Profile> {
    return this.http.get<Profile>('/api/me');
  }

  updateName(name: string): Observable<User> {
    return this.http.patch<User>('/api/me', { name });
  }

  favorites(): Observable<SpotSummary[]> {
    const params = new HttpParams({
      fromObject: { lat: String(REFERENCE_POINT.latitude), lng: String(REFERENCE_POINT.longitude) },
    });
    return this.http.get<SpotSummary[]>('/api/me/favorites', { params });
  }

  addFavorite(spotId: number): Observable<void> {
    return this.http.put<void>(`/api/me/favorites/${spotId}`, {});
  }

  removeFavorite(spotId: number): Observable<void> {
    return this.http.delete<void>(`/api/me/favorites/${spotId}`);
  }

  myReviews(): Observable<Review[]> {
    return this.http.get<Review[]>('/api/me/reviews');
  }

  deleteReview(reviewId: number): Observable<void> {
    return this.http.delete<void>(`/api/reviews/${reviewId}`);
  }

  sendContactMessage(message: { name: string; email: string; message: string }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/contact', message);
  }
}
