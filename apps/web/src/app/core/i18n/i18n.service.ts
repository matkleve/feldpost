import { computed, Injectable, signal } from '@angular/core';
import { LanguageCode, TRANSLATION_BY_KEY, TRANSLATION_BY_ORIGINAL } from './translation-catalog';

const LANGUAGE_STORAGE_KEY = 'feldpost.settings.language';

interface RuntimeLanguageDictionary {
  byKey: Record<string, string>;
  byOriginal: Record<string, string>;
}

interface RuntimeTranslationEntry {
  key: string;
  original: string;
  value: string;
}

const HEURISTIC_DE_PHRASE_MAP: Record<string, string> = {
  'Add a filter': 'Filter hinzufügen',
  'No filters applied': 'Keine Filter aktiv',
  'Remove filter': 'Filter entfernen',
  Where: 'Wobei',
  And: 'Und',
  Or: 'Oder',
  Property: 'Eigenschaft',
  Operator: 'Operator',
  'Value...': 'Wert...',
  'Value…': 'Wert…',
  'Sign in': 'Anmelden',
  'Create account': 'Konto erstellen',
  'Create one': 'Konto erstellen',
  'Forgot password?': 'Passwort vergessen?',
  'Back to sign in': 'Zurück zur Anmeldung',
  'Check your email': 'Prüfe deine E-Mail',
  'Email is required.': 'E-Mail ist erforderlich.',
  'Enter a valid email address.': 'Gib eine gültige E-Mail-Adresse ein.',
  "Enter your email and we'll send you a reset link.":
    'Gib deine E-Mail-Adresse ein und wir senden dir einen Zurücksetzungslink.',
  'New password': 'Neues Passwort',
  'Confirm new password': 'Neues Passwort bestätigen',
  'Confirm password': 'Passwort bestätigen',
  'No uploads yet': 'Noch keine Uploads',
  'No projects found': 'Keine Projekte gefunden',
  'No projects match your filters': 'Keine Projekte passen zu deinen Filtern',
  'No recent searches yet.': 'Noch keine letzten Suchen.',
  'No photo attached': 'Kein Foto angehängt',
  'Loading...': 'Wird geladen...',
  'Loading…': 'Wird geladen…',
  'Loading projects': 'Projekte werden geladen',
  'Loading image details': 'Bilddetails werden geladen',
  'Loading QR code': 'QR-Code wird geladen',
  'Map style': 'Kartenstil',
  'Photo map': 'Fotokarte',
  'Historic map': 'Historische Karte',
  'Street map': 'Straßenkarte',
  'Back to gallery': 'Zurück zur Galerie',
  'Add to project': 'Zum Projekt hinzufügen',
  'Delete image': 'Bild löschen',
  'Copy coordinates': 'Koordinaten kopieren',
  'Place on map': 'Auf Karte platzieren',
  'Main navigation': 'Hauptnavigation',
  'Open settings overlay': 'Einstellungs-Overlay öffnen',
  'Close settings overlay': 'Einstellungs-Overlay schließen',
  'Workspace Preferences': 'Arbeitsbereich-Einstellungen',
  'Settings sections': 'Einstellungsbereiche',
  'Upload failure alerts': 'Upload-Fehlerhinweise',
  'Map Preferences': 'Karten-Einstellungen',
  'Search Tuning': 'Such-Optimierung',
  'Data and Privacy': 'Daten und Datenschutz',
  'Invite Management': 'Einladungsverwaltung',
  Logout: 'Abmelden',
  'Logout now?': 'Jetzt abmelden?',
  'Confirm logout': 'Abmeldung bestätigen',
  'Logging out...': 'Abmeldung läuft...',
  'Logout failed. Please try again.': 'Abmeldung fehlgeschlagen. Bitte versuche es erneut.',
  'This ends your current Feldpost session on this device.':
    'Dadurch wird deine aktuelle Feldpost-Sitzung auf diesem Gerät beendet.',
  '. Click it to activate your account.': '. Klicke darauf, um dein Konto zu aktivieren.',
  'Add files to start. Status dots and lane filters appear once files enter the queue.':
    'Füge Dateien hinzu, um zu starten. Statuspunkte und Spurfilter erscheinen, sobald Dateien in die Warteschlange gelangen.',
  'Add photos, videos, PDFs, and Office files for the active project.':
    'Füge Fotos, Videos, PDFs und Office-Dateien für das aktive Projekt hinzu.',
  'Already have an account?': 'Hast du bereits ein Konto?',
  "Don't have an account?": 'Noch kein Konto?',
  'Choose a strong password for your account.': 'Wähle ein sicheres Passwort für dein Konto.',
  'Drag & drop files here': 'Dateien hierher ziehen und ablegen',
  'Drag files here or click to select': 'Dateien hierher ziehen oder zum Auswählen klicken',
  'Full name is required.': 'Vollständiger Name ist erforderlich.',
  'GPS assignment disabled for this file type.':
    'GPS-Zuweisung ist für diesen Dateityp deaktiviert.',
  'GPS assignment is disabled for this file type.':
    'GPS-Zuweisung ist für diesen Dateityp deaktiviert.',
  'No GPS: this item can only belong to one project.':
    'Kein GPS: Dieser Eintrag kann nur zu einem Projekt gehören.',
  'This feature is coming soon.': 'Diese Funktion kommt bald.',
  'Try a different address or pin manually.':
    'Versuche eine andere Adresse oder setze den Pin manuell.',
  'Try another search or reset your status filter.':
    'Versuche eine andere Suche oder setze deinen Statusfilter zurück.',
  'We sent a confirmation link to':
    'Wir haben einen Bestätigungslink an folgende Adresse gesendet:',
  'We sent a password reset link to':
    'Wir haben einen Link zum Zurücksetzen des Passworts an folgende Adresse gesendet:',
  'Welcome back to Feldpost': 'Willkommen zurück bei Feldpost',
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly languageSignal = signal<LanguageCode>(this.readInitialLanguage());
  private readonly runtimeDictionaries = signal<Record<LanguageCode, RuntimeLanguageDictionary>>({
    en: { byKey: {}, byOriginal: {} },
    de: { byKey: {}, byOriginal: {} },
  });

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
    const runtime = this.runtimeDictionaries()[this.languageSignal()].byKey[key];
    if (runtime) return runtime;

    const entry = TRANSLATION_BY_KEY[key];
    if (!entry) return fallback || key;
    return this.languageSignal() === 'de' ? entry.de : entry.en;
  }

  translateOriginal(original: string, fallback = ''): string {
    const runtime = this.runtimeDictionaries()[this.languageSignal()].byOriginal[original];
    if (runtime) return runtime;

    const entry = TRANSLATION_BY_ORIGINAL[original];
    if (!entry) {
      if (this.languageSignal() === 'de') {
        return this.heuristicTranslateToGerman(original);
      }
      return fallback || original;
    }
    return this.languageSignal() === 'de' ? entry.de : entry.en;
  }

  setRuntimeTranslations(
    language: LanguageCode,
    entries: ReadonlyArray<RuntimeTranslationEntry>,
  ): void {
    const byKey: Record<string, string> = {};
    const byOriginal: Record<string, string> = {};

    for (const entry of entries) {
      byKey[entry.key] = entry.value;
      byOriginal[entry.original] = entry.value;
    }

    this.runtimeDictionaries.update((current) => ({
      ...current,
      [language]: { byKey, byOriginal },
    }));
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
    if (typeof window === 'undefined') return 'de';

    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'de') return stored;

    const browser = navigator.language.toLowerCase();
    return browser.startsWith('en') ? 'en' : 'de';
  }

  private heuristicTranslateToGerman(value: string): string {
    const phrase = HEURISTIC_DE_PHRASE_MAP[value];
    if (phrase) return phrase;

    // Avoid mixed-language fragments from word-by-word fallback.
    return value;
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
