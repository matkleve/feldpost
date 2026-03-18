import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService language switch smoke', () => {
  beforeEach(() => {
    localStorage.removeItem('feldpost.settings.language');
    localStorage.removeItem('feldpost.i18n.enableLegacyFallback');
    document.documentElement.lang = 'en';

    TestBed.configureTestingModule({});
  });

  it('updates document language when switching language', () => {
    const service = TestBed.inject(I18nService);

    service.setLanguage('de');
    expect(document.documentElement.lang).toBe('de');

    service.setLanguage('it');
    expect(document.documentElement.lang).toBe('it');

    service.setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('resolves core page keys for en/de/it', () => {
    const service = TestBed.inject(I18nService);

    service.setLanguage('en');
    expect(service.t('auth.login.title', 'fallback')).toBe('Sign in');
    expect(service.t('map.shell.uploadButton.title', 'fallback')).toBe('Upload images');
    expect(service.t('settings.overlay.section.search.title', 'fallback')).toBe('Search Tuning');

    service.setLanguage('de');
    expect(service.t('auth.login.title', 'fallback')).toBe('Anmelden');
    expect(service.t('map.shell.uploadButton.title', 'fallback')).toBe('Bilder hochladen');
    expect(service.t('settings.overlay.section.search.title', 'fallback')).toBe('Such-Optimierung');

    service.setLanguage('it');
    expect(service.t('auth.login.title', 'fallback')).toBe('Accedi');
    expect(service.t('map.shell.uploadButton.title', 'fallback')).toBe('Carica immagini');
    expect(service.t('settings.overlay.section.search.title', 'fallback')).toBe(
      'Cerca sintonizzazione',
    );
  });

  it('does not apply heuristic fallback for unknown phrases when legacy fallback is disabled', () => {
    const service = TestBed.inject(I18nService);
    service.setLanguage('de');

    const unknown = 'Custom phrase never shipped in catalog';
    expect(service.translateOriginal(unknown, unknown)).toBe(unknown);
  });
});
