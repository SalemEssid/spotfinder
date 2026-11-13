import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/**
 * The current time as a signal, refreshed every 30 s.
 * Everything that says "il y a 10 min" or "dans 9 min" reads it, so those texts stay correct
 * while the page is open, without each component running its own timer.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly current = signal(new Date());
  readonly now = this.current.asReadonly();

  constructor() {
    const timer = setInterval(() => this.current.set(new Date()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  /** Forces a refresh (e.g. right after a report). */
  tick(): void {
    this.current.set(new Date());
  }
}
