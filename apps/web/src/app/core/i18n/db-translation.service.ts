import { Injectable, effect, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { SupabaseService } from '../supabase.service';
import { I18nService } from './i18n.service';
import { LanguageCode } from './translation-catalog';

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
    if (!this.authService.user()) return;

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

    this.i18nService.setRuntimeTranslations(language, runtimeEntries);
  }
}
