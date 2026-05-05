import { Injectable, signal } from '@angular/core';
import type { ToastItem, ToastOptions } from './toast.types';

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _items = signal<ToastItem[]>([]);
  readonly items = this._items.asReadonly();

  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  show(options: ToastOptions): string {
    const type = options.type ?? 'info';
    const duration = options.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

    if (options.dedupe) {
      const existing = this._items().find(
        (t) => t.message === options.message && t.type === type && t.state !== 'exiting',
      );
      if (existing) return existing.id;
    }

    const item: ToastItem = {
      id: generateId(),
      message: options.message,
      type,
      duration,
      state: 'entering',
      createdAt: Date.now(),
      startedAt: Date.now(),
    };

    this._items.update((list) => [...list, item]);
    this.enforceMaxLimit();

    if (duration > 0) {
      this.startTimer(item.id, duration);
    }

    return item.id;
  }

  dismiss(id: string): void {
    const item = this._items().find((t) => t.id === id);
    if (!item || item.state === 'exiting') return;
    this.clearTimer(id);
    this._items.update((list) =>
      list.map((t) => (t.id === id ? { ...t, state: 'exiting' as const } : t)),
    );
  }

  dismissAll(): void {
    for (const item of this._items()) {
      this.clearTimer(item.id);
    }
    this._items.update((list) =>
      list.filter((t) => t.state !== 'exiting').map((t) => ({ ...t, state: 'exiting' as const })),
    );
  }

  /** Called by ToastItemComponent after its enter animation completes. */
  markVisible(id: string): void {
    this._items.update((list) =>
      list.map((t) =>
        t.id === id && t.state === 'entering' ? { ...t, state: 'visible' as const } : t,
      ),
    );
  }

  /** Called by ToastItemComponent after its exit animation completes. */
  afterExit(id: string): void {
    this._items.update((list) => list.filter((t) => t.id !== id));
  }

  pause(id: string): void {
    const item = this._items().find((t) => t.id === id);
    if (!item || item.duration === 0) return;
    this.clearTimer(id);
    const remaining = item.duration - (Date.now() - item.startedAt);
    this._items.update((list) =>
      list.map((t) => (t.id === id ? { ...t, remainingMs: Math.max(remaining, 0) } : t)),
    );
  }

  resume(id: string): void {
    const item = this._items().find((t) => t.id === id);
    if (!item || item.duration === 0 || item.state === 'exiting') return;
    const remaining = item.remainingMs ?? item.duration;
    this._items.update((list) =>
      list.map((t) => (t.id === id ? { ...t, startedAt: Date.now(), remainingMs: undefined } : t)),
    );
    this.startTimer(id, remaining);
  }

  /** Clears all state and timers — for test teardown only. */
  _testReset(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this._items.set([]);
  }

  private startTimer(id: string, ms: number): void {
    this.clearTimer(id);
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        this.dismiss(id);
      }, ms),
    );
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private enforceMaxLimit(): void {
    const active = this._items().filter((t) => t.state !== 'exiting');
    if (active.length <= MAX_VISIBLE) return;
    const toRemove = active.slice(0, active.length - MAX_VISIBLE);
    for (const item of toRemove) {
      this.dismiss(item.id);
    }
  }
}
