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
  'Date captured': 'Aufnahmedatum',
  'Date uploaded': 'Upload-Datum',
  Name: 'Name',
  Distance: 'Entfernung',
  Address: 'Adresse',
  City: 'Stadt',
  District: 'Bezirk',
  Street: 'Straße',
  Country: 'Land',
  Project: 'Projekt',
  Date: 'Datum',
  Year: 'Jahr',
  Month: 'Monat',
  User: 'Nutzer',
  'Unknown date': 'Unbekanntes Datum',
  Unnamed: 'Unbenannt',
  'Unknown distance': 'Unbekannte Entfernung',
  'No project': 'Kein Projekt',
  'Unknown year': 'Unbekanntes Jahr',
  'Unknown month': 'Unbekannter Monat',
  'Unknown city': 'Unbekannte Stadt',
  'Unknown district': 'Unbekannter Bezirk',
  'Unknown street': 'Unbekannte Straße',
  'Unknown country': 'Unbekanntes Land',
  'Unknown address': 'Unbekannte Adresse',
  'Unknown user': 'Unbekannter Nutzer',
  No: 'Kein',
};

const HEURISTIC_IT_PHRASE_MAP: Record<string, string> = {
  'Add a filter': 'Aggiungi un filtro',
  'No filters applied': 'Nessun filtro attivo',
  'Remove filter': 'Rimuovi filtro',
  Where: 'Dove',
  And: 'E',
  Or: 'O',
  Property: 'Proprieta',
  Operator: 'Operatore',
  'Value...': 'Valore...',
  'Value…': 'Valore…',
  'Sign in': 'Accedi',
  'Create account': 'Crea account',
  'Forgot password?': 'Password dimenticata?',
  'Back to sign in': "Torna all'accesso",
  'Check your email': 'Controlla la tua email',
  'Email is required.': "L'email e obbligatoria.",
  'Enter a valid email address.': 'Inserisci un indirizzo email valido.',
  "Enter your email and we'll send you a reset link.":
    'Inserisci la tua email e ti invieremo un link di reimpostazione.',
  'No uploads yet': 'Nessun caricamento ancora',
  'No projects found': 'Nessun progetto trovato',
  'No projects match your filters': 'Nessun progetto corrisponde ai tuoi filtri',
  'Loading...': 'Caricamento...',
  'Loading…': 'Caricamento…',
  'Map style': 'Stile mappa',
  'Photo map': 'Mappa foto',
  'Historic map': 'Mappa storica',
  'Street map': 'Mappa stradale',
  'Back to gallery': 'Torna alla galleria',
  'Add to project': 'Aggiungi al progetto',
  'Delete image': 'Elimina immagine',
  'Copy coordinates': 'Copia coordinate',
  'Place on map': 'Posiziona sulla mappa',
  Logout: 'Disconnetti',
  'Date captured': 'Data di acquisizione',
  'Date uploaded': 'Data di caricamento',
  Name: 'Nome',
  Distance: 'Distanza',
  Address: 'Indirizzo',
  City: 'Citta',
  District: 'Distretto',
  Street: 'Via',
  Country: 'Paese',
  Project: 'Progetto',
  Date: 'Data',
  Year: 'Anno',
  Month: 'Mese',
  User: 'Utente',
  'Unknown date': 'Data sconosciuta',
  Unnamed: 'Senza nome',
  'Unknown distance': 'Distanza sconosciuta',
  'No project': 'Nessun progetto',
  'Unknown year': 'Anno sconosciuto',
  'Unknown month': 'Mese sconosciuto',
  'Unknown city': 'Citta sconosciuta',
  'Unknown district': 'Distretto sconosciuto',
  'Unknown street': 'Via sconosciuta',
  'Unknown country': 'Paese sconosciuto',
  'Unknown address': 'Indirizzo sconosciuto',
  'Unknown user': 'Utente sconosciuto',
  No: 'Nessun',
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly languageSignal = signal<LanguageCode>(this.readInitialLanguage());
  private readonly runtimeDictionaries = signal<Record<LanguageCode, RuntimeLanguageDictionary>>({
    en: { byKey: {}, byOriginal: {} },
    de: { byKey: {}, byOriginal: {} },
    it: { byKey: {}, byOriginal: {} },
  });

  readonly language = this.languageSignal.asReadonly();
  readonly locale = computed(() => {
    switch (this.languageSignal()) {
      case 'de':
        return 'de-AT';
      case 'it':
        return 'it-IT';
      default:
        return 'en-GB';
    }
  });

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
    switch (this.languageSignal()) {
      case 'de':
        return entry.de;
      case 'it':
        return entry.it ?? entry.en;
      default:
        return entry.en;
    }
  }

  translateOriginal(original: string, fallback = ''): string {
    const runtime = this.runtimeDictionaries()[this.languageSignal()].byOriginal[original];
    if (runtime) return runtime;

    const entry = TRANSLATION_BY_ORIGINAL[original];
    if (!entry) {
      if (this.languageSignal() === 'de') {
        return this.heuristicTranslateToGerman(original);
      }
      if (this.languageSignal() === 'it') {
        return this.heuristicTranslateToItalian(original);
      }
      return fallback || original;
    }
    switch (this.languageSignal()) {
      case 'de':
        return entry.de;
      case 'it':
        return entry.it ?? entry.en;
      default:
        return entry.en;
    }
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
    if (stored === 'en' || stored === 'de' || stored === 'it') return stored;

    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('it')) return 'it';
    return browser.startsWith('en') ? 'en' : 'de';
  }

  private heuristicTranslateToGerman(value: string): string {
    const phrase = HEURISTIC_DE_PHRASE_MAP[value];
    if (phrase) return phrase;

    // Avoid mixed-language fragments from word-by-word fallback.
    return value;
  }

  private heuristicTranslateToItalian(value: string): string {
    const phrase = HEURISTIC_IT_PHRASE_MAP[value];
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
