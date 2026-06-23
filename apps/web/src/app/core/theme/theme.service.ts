import { Injectable, computed, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system' | 'sandstone';

const STORAGE_KEY = 'feldpost.settings.themeMode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(this.readFromStorage());

  readonly mode = this._mode.asReadonly();

  readonly isDark = computed(() => {
    const m = this._mode();
    if (m === 'dark') return true;
    if (m === 'light' || m === 'sandstone') return false;
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  constructor() {
    this.apply(this._mode());
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }
  }

  private readFromStorage(): ThemeMode {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'sandstone') {
      return stored;
    }
    return 'system';
  }
}
