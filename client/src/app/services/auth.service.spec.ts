import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type UrlTree } from '@angular/router';
import { authGuard } from '../guards/auth.guard';
import type { User } from '../models/user.model';
import { AuthService } from './auth.service';

const USER: User = {
  id: 1,
  name: 'Compte Démo',
  email: 'demo@spotfinder.tn',
  role: 'user',
  createdAt: '2026-11-01T00:00:00Z',
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('restores the session after a refresh', async () => {
    const restoring = service.restoreSession();
    http.expectOne('/api/auth/me').flush({ user: USER });
    await restoring;
    expect(service.user()).toEqual(USER);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('stays logged out when there is no session', async () => {
    const restoring = service.restoreSession();
    http.expectOne('/api/auth/me').flush({ user: null });
    await restoring;
    expect(service.isLoggedIn()).toBe(false);
  });

  it('stays logged out (no crash) when the API is unreachable', async () => {
    const restoring = service.restoreSession();
    http.expectOne('/api/auth/me').error(new ProgressEvent('error'));
    await restoring;
    expect(service.user()).toBeNull();
  });

  it('logs in and out', () => {
    service.login('demo@spotfinder.tn', 'SpotFinder2026').subscribe();
    const request = http.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({
      email: 'demo@spotfinder.tn',
      password: 'SpotFinder2026',
    });
    request.flush(USER);
    expect(service.user()?.name).toBe('Compte Démo');

    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush(null);
    expect(service.isLoggedIn()).toBe(false);
  });
});

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  const runGuard = (url: string) =>
    TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never));

  it('sends visitors to the login page, remembering where they wanted to go', () => {
    const result = runGuard('/compte/favoris') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/connexion?redirect=%2Fcompte%2Ffavoris',
    );
  });

  it('lets logged-in members through', () => {
    TestBed.inject(AuthService).updateLocalUser(USER);
    expect(runGuard('/compte')).toBe(true);
  });
});
