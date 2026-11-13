import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** Non-blocking notifications ("Merci ! Affluence mise à jour", errors…). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<Toast[]>([]);
  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.show('success', message, 4000);
  }

  info(message: string): void {
    this.show('info', message, 4000);
  }

  /** Errors stay longer: they usually need to be read. */
  error(message: string): void {
    this.show('error', message, 7000);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  private show(kind: ToastKind, message: string, durationMs: number): void {
    const toast: Toast = { id: this.nextId++, kind, message };
    // Keep at most 3 toasts on screen.
    this.items.update((list) => [...list.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }
}
