import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { SupabaseService } from '../supabase.service';
import { I18nService } from './i18n.service';
import { LanguageCode } from './translation-catalog';

const DB_TRANSLATION_CACHE_PREFIX = 'feldpost.i18n.runtime';
const DB_TRANSLATION_CACHE_TTL_MS = 10 * 60 * 1000;

interface RuntimeTranslationEntry {
  key: string;
  original: string;
  value: string;
}

interface RuntimeTranslationCacheEntry {
  storedAt: number;
  entries: RuntimeTranslationEntry[];
}

interface AppTextJoin {
  key: string;
  source_text: string;
}

interface TranslationRow {
  translated_text: string;
  app_texts: AppTextJoin | AppTextJoin[] | null;
}

@Injectable({ providedIn: 'root' })
export class DbTranslationService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  private readonly i18nService = inject(I18nService);
  private readonly inMemoryCache = new Map<string, RuntimeTranslationCacheEntry>();
  private readonly inFlightRequests = new Map<string, Promise<void>>();
  private readonly appliedRuntimeDictionaries = new Set<string>();

  constructor() {
    effect(() => {
      const language = this.i18nService.language();
      void this.ensureLoaded(language);
    });
  }

  async preload(): Promise<void> {
    await this.ensureLoaded(this.i18nService.language());
  }

  async ensureLoaded(language: LanguageCode): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    const cacheKey = this.buildCacheKey(userId, language);
    if (this.appliedRuntimeDictionaries.has(cacheKey)) {
      return;
    }

    const memoryCached = this.inMemoryCache.get(cacheKey) ?? null;
    if (memoryCached && this.isFresh(memoryCached)) {
      this.i18nService.setRuntimeTranslations(language, memoryCached.entries);
      this.appliedRuntimeDictionaries.add(cacheKey);
      return;
    }

    const localStorageCached = this.readLocalStorageCache(cacheKey);
    if (localStorageCached && this.isFresh(localStorageCached)) {
      this.inMemoryCache.set(cacheKey, localStorageCached);
      this.i18nService.setRuntimeTranslations(language, localStorageCached.entries);
      this.appliedRuntimeDictionaries.add(cacheKey);
      return;
    }

    const existingRequest = this.inFlightRequests.get(cacheKey);
    if (existingRequest) {
      await existingRequest;
      return;
    }

    const request = this.fetchAndCache(language, cacheKey);
    this.inFlightRequests.set(cacheKey, request);

    try {
      await request;
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  private async fetchAndCache(language: LanguageCode, cacheKey: string): Promise<void> {
    const now = Date.now();

    const { data, error } = await this.supabase.client
      .from('app_text_translations')
      .select('translated_text, app_texts!inner(key, source_text)')
      .eq('lang', language)
      .eq('status', 'published');

    if (error) {
      console.error('Failed to load DB translations', error.message);
      return;
    }

    const rows = (data ?? []) as TranslationRow[];
    const runtimeEntries = rows
      .map((row) => {
        const joined = Array.isArray(row.app_texts) ? row.app_texts[0] : row.app_texts;
        if (!joined) return null;

        return {
          key: joined.key,
          original: joined.source_text,
          value: row.translated_text,
        };
      })
      .filter((entry): entry is { key: string; original: string; value: string } => entry !== null);

    const cacheEntry: RuntimeTranslationCacheEntry = {
      storedAt: now,
      entries: runtimeEntries,
    };

    this.inMemoryCache.set(cacheKey, cacheEntry);
    this.writeLocalStorageCache(cacheKey, cacheEntry);

    this.i18nService.setRuntimeTranslations(language, runtimeEntries);
    this.appliedRuntimeDictionaries.add(cacheKey);
  }

  private buildCacheKey(userId: string, language: LanguageCode): string {
    return `${DB_TRANSLATION_CACHE_PREFIX}:${userId}:${language}`;
  }

  private isFresh(entry: RuntimeTranslationCacheEntry | null | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.storedAt <= DB_TRANSLATION_CACHE_TTL_MS;
  }

  private readLocalStorageCache(cacheKey: string): RuntimeTranslationCacheEntry | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as RuntimeTranslationCacheEntry;
      if (!parsed || !Array.isArray(parsed.entries) || typeof parsed.storedAt !== 'number') {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private writeLocalStorageCache(cacheKey: string, entry: RuntimeTranslationCacheEntry): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
      // Ignore storage quota/serialization errors and keep in-memory cache only.
    }
  }
}
