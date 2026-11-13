import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable, tap } from 'rxjs';
import type { User } from '../models/user.model';

/**
 * Who is logged in, as a signal every component can read.
 * The session itself lives in an httpOnly cookie set by the API: this service never sees the token.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  /** Called once at startup (see app.config.ts): restores the session after a page refresh. */
  async restoreSession(): Promise<void> {
    try {
      const { user } = await firstValueFrom(this.http.get<{ user: User | null }>('/api/auth/me'));
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null); // API unreachable: behave as logged out, pages show their own errors
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<User>('/api/auth/login', { email, password }).pipe(tap((user) => this.currentUser.set(user)));
  }

  register(name: string, email: string, password: string): Observable<User> {
    return this.http
      .post<User>('/api/auth/register', { name, email, password })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(tap(() => this.currentUser.set(null)));
  }

  /** After a profile edit. */
  updateLocalUser(user: User): void {
    this.currentUser.set(user);
  }

  /** The API answered 401 on a protected call: the session expired. */
  clearSession(): void {
    this.currentUser.set(null);
  }
}
