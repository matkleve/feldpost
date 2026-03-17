import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageCode } from '../../core/i18n/translation-catalog';
import { SettingsPaneService } from '../../core/settings-pane.service';
import { InviteManagementSectionComponent } from './sections/invite-management-section.component';
import { AccountComponent } from '../account/account.component';

type ThemeMode = 'light' | 'dark' | 'system' | 'sandstone';

type DensityMode = 'compact' | 'comfortable';

type SearchBias = 'balanced' | 'address-first' | 'place-first';

type MarkerMotionPreference = 'off' | 'smooth';

const MAP_MARKER_MOTION_STORAGE_KEY = 'feldpost.settings.map.markerMotion';
const MAP_MARKER_MOTION_EVENT = 'feldpost:map-marker-motion-changed';
const THEME_MODE_STORAGE_KEY = 'feldpost.settings.themeMode';

interface SettingsSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

interface SettingsModel {
  themeMode: ThemeMode;
  density: DensityMode;
  language: LanguageCode;
  notificationsEnabled: boolean;
  uploadFailureAlerts: boolean;
  mapAutoLocate: boolean;
  mapGridOverlay: boolean;
  markerMotion: MarkerMotionPreference;
  searchBias: SearchBias;
  searchRadiusKm: number;
  cacheRetentionDays: number;
  telemetryEnabled: boolean;
}

type SettingsLoadState = 'loading' | 'error' | 'populated';

@Component({
  selector: 'ss-settings-overlay',
  standalone: true,
  imports: [InviteManagementSectionComponent, AccountComponent],
  templateUrl: './settings-overlay.component.html',
  styleUrl: './settings-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverlayComponent {
  private readonly i18nService = inject(I18nService);
  private readonly settingsPaneService = inject(SettingsPaneService);

  readonly open = input(false);
  readonly openChange = output<boolean>();
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly sectionList = computed<ReadonlyArray<SettingsSection>>(() => [
    {
      id: 'general',
      icon: 'tune',
      title: this.t('settings.overlay.section.general.title', 'General'),
      subtitle: this.t(
        'settings.overlay.section.general.subtitle',
        'Language, density, and defaults',
      ),
    },
    {
      id: 'appearance',
      icon: 'palette',
      title: this.t('settings.overlay.section.appearance.title', 'Appearance'),
      subtitle: this.t('settings.overlay.section.appearance.subtitle', 'Theme and visual behavior'),
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: this.t('settings.overlay.section.notifications.title', 'Notifications'),
      subtitle: this.t(
        'settings.overlay.section.notifications.subtitle',
        'In-app status and alerts',
      ),
    },
    {
      id: 'map',
      icon: 'map',
      title: this.t('settings.overlay.section.map.title', 'Map Preferences'),
      subtitle: this.t('settings.overlay.section.map.subtitle', 'Map behaviors and helper layers'),
    },
    {
      id: 'search',
      icon: 'manage_search',
      title: this.t('settings.overlay.section.search.title', 'Search Tuning'),
      subtitle: this.t('settings.overlay.section.search.subtitle', 'Ranking and fallback tuning'),
    },
    {
      id: 'data',
      icon: 'storage',
      title: this.t('settings.overlay.section.data.title', 'Data and Privacy'),
      subtitle: this.t('settings.overlay.section.data.subtitle', 'Retention and telemetry'),
    },
    {
      id: 'account',
      icon: 'person',
      title: this.t('settings.overlay.section.account.title', 'Account'),
      subtitle: this.t('settings.overlay.section.account.subtitle', 'Identity and sign-in context'),
    },
    {
      id: 'invite-management',
      icon: 'qr_code_2',
      title: this.t('settings.overlay.section.invites.title', 'Invite Management'),
      subtitle: this.t(
        'settings.overlay.section.invites.subtitle',
        'Role-scoped QR and share links',
      ),
    },
  ]);

  readonly selectedSectionId = signal<string>('general');
  readonly loadState = signal<SettingsLoadState>('populated');
  readonly lastError = signal<string | null>(null);
  readonly inviteSectionRequest = this.settingsPaneService.inviteSectionRequest;

  readonly settingsModel = signal<SettingsModel>({
    themeMode: this.readThemeModePreference(),
    density: 'comfortable',
    language: this.i18nService.language(),
    notificationsEnabled: true,
    uploadFailureAlerts: true,
    mapAutoLocate: false,
    mapGridOverlay: false,
    markerMotion: this.readMarkerMotionPreference(),
    searchBias: 'balanced',
    searchRadiusKm: 2,
    cacheRetentionDays: 30,
    telemetryEnabled: false,
  });

  constructor() {
    effect(() => {
      const pendingSection = this.settingsPaneService.selectedSectionId();
      if (pendingSection) {
        this.selectedSectionId.set(pendingSection);
      }
    });

    effect(() => {
      this.applyThemeMode(this.settingsModel().themeMode);
    });
  }

  onOverlayAttach(): void {
    // No-op: section content renders immediately; async loading is section-local.
  }

  onEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
    }
  }

  requestClose(): void {
    this.openChange.emit(false);
  }

  selectSection(sectionId: string): void {
    this.selectedSectionId.set(sectionId);
    if (
      sectionId === 'general' ||
      sectionId === 'appearance' ||
      sectionId === 'notifications' ||
      sectionId === 'map' ||
      sectionId === 'search' ||
      sectionId === 'data' ||
      sectionId === 'account' ||
      sectionId === 'invite-management'
    ) {
      this.settingsPaneService.setSelectedSection(sectionId);
    }
  }

  updatePosition(): void {
    // No-op: overlay is now a fixed pane rendered inside app-nav.
  }

  retryLoad(): void {
    this.lastError.set(null);
    this.loadState.set('populated');
  }

  isSectionSelected(sectionId: string): boolean {
    return this.selectedSectionId() === sectionId;
  }

  setThemeMode(themeMode: ThemeMode): void {
    this.settingsModel.update((model) => ({ ...model, themeMode }));

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }

  setDensity(density: DensityMode): void {
    this.settingsModel.update((model) => ({ ...model, density }));
  }

  setLanguage(language: LanguageCode): void {
    this.settingsModel.update((model) => ({ ...model, language }));
    this.i18nService.setLanguage(language);
  }

  setSearchBias(searchBias: SearchBias): void {
    this.settingsModel.update((model) => ({ ...model, searchBias }));
  }

  setMarkerMotion(markerMotion: MarkerMotionPreference): void {
    this.settingsModel.update((model) => ({ ...model, markerMotion }));
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(MAP_MARKER_MOTION_STORAGE_KEY, markerMotion);
    window.dispatchEvent(
      new CustomEvent(MAP_MARKER_MOTION_EVENT, {
        detail: { markerMotion },
      }),
    );
  }

  setSearchRadius(radiusKm: number): void {
    this.settingsModel.update((model) => ({ ...model, searchRadiusKm: radiusKm }));
  }

  setCacheRetentionDays(cacheRetentionDays: number): void {
    this.settingsModel.update((model) => ({ ...model, cacheRetentionDays }));
  }

  toggleSetting(
    settingKey: keyof Pick<
      SettingsModel,
      | 'notificationsEnabled'
      | 'uploadFailureAlerts'
      | 'mapAutoLocate'
      | 'mapGridOverlay'
      | 'telemetryEnabled'
    >,
  ): void {
    this.settingsModel.update((model) => ({
      ...model,
      [settingKey]: !model[settingKey],
    }));
  }

  private readMarkerMotionPreference(): MarkerMotionPreference {
    if (typeof window === 'undefined') return 'smooth';
    const stored = window.localStorage.getItem(MAP_MARKER_MOTION_STORAGE_KEY);
    return stored === 'off' ? 'off' : 'smooth';
  }

  private readThemeModePreference(): ThemeMode {
    if (typeof window === 'undefined') return 'system';

    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'sandstone') {
      return stored;
    }

    return 'system';
  }

  private applyThemeMode(themeMode: ThemeMode): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    if (themeMode === 'system') {
      root.removeAttribute('data-theme');
      return;
    }

    root.setAttribute('data-theme', themeMode);
  }
}
