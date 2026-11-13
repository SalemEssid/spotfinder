import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Knows whether the user arrived on the current page from another page of the app.
 * "← Explorer" then goes *back* (keeping the filters of the list) instead of opening a fresh Explorer.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private navigations = 0;

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.navigations++);
  }

  canGoBack(): boolean {
    return this.navigations > 1;
  }
}
