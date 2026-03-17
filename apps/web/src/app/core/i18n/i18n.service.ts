import { computed, Injectable, signal } from '@angular/core';
import { LanguageCode, TRANSLATION_BY_KEY } from './translation-catalog';

const LANGUAGE_STORAGE_KEY = 'feldpost.settings.language';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly languageSignal = signal<LanguageCode>(this.readInitialLanguage());

  readonly language = this.languageSignal.asReadonly();
  readonly locale = computed(() => (this.languageSignal() === 'de' ? 'de-AT' : 'en-GB'));

  constructor() {
    this.applyDocumentLanguage(this.languageSignal());
  }

  setLanguage(language: LanguageCode): void {
    this.languageSignal.set(language);
    this.persistLanguage(language);
    this.applyDocumentLanguage(language);
  }

  t(key: string, fallback = ''): string {
    const entry = TRANSLATION_BY_KEY[key];
    if (!entry) return fallback || key;
    return this.languageSignal() === 'de' ? entry.de : entry.en;
  }

  formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    return new Date(value).toLocaleDateString(this.locale(), options);
  }

  formatDateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    return new Date(value).toLocaleString(this.locale(), options);
  }

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), options).format(value);
  }

  private readInitialLanguage(): LanguageCode {
    if (typeof window === 'undefined') return 'en';

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'de') return stored;

    const browser = navigator.language.toLowerCase();
    return browser.startsWith('de') ? 'de' : 'en';
  }

  private persistLanguage(language: LanguageCode): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  private applyDocumentLanguage(language: LanguageCode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }
}
