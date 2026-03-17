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
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageCode } from '../../core/i18n/translation-catalog';
import { SettingsPaneService } from '../../core/settings-pane.service';
import { InviteManagementSectionComponent } from './sections/invite-management-section.component';
import { AccountComponent } from '../account/account.component';

type SettingsLoadState = 'loading' | 'error' | 'populated';

type ThemeMode = 'light' | 'dark' | 'system';

type DensityMode = 'compact' | 'comfortable';

type SearchBias = 'balanced' | 'address-first' | 'place-first';

type MarkerMotionPreference = 'off' | 'smooth';

const MAP_MARKER_MOTION_STORAGE_KEY = 'feldpost.settings.map.markerMotion';
const MAP_MARKER_MOTION_EVENT = 'feldpost:map-marker-motion-changed';

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

@Component({
  selector: 'ss-settings-overlay',
  standalone: true,
  imports: [InviteManagementSectionComponent, AccountComponent],
  templateUrl: './settings-overlay.component.html',
  styleUrl: './settings-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverlayComponent {
  private readonly authService = inject(AuthService);
  private readonly i18nService = inject(I18nService);
  private readonly settingsPaneService = inject(SettingsPaneService);
  private hasLoadedOnce = false;

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
  readonly loadState = signal<SettingsLoadState>('loading');
  readonly lastError = signal<string | null>(null);
  readonly inviteSectionRequest = this.settingsPaneService.inviteSectionRequest;

  readonly settingsModel = signal<SettingsModel>({
    themeMode: 'system',
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
      if (this.open() && !this.hasLoadedOnce) {
        this.startLoad();
        this.hasLoadedOnce = true;
      }
    });

    effect(() => {
      const pendingSection = this.settingsPaneService.selectedSectionId();
      if (pendingSection) {
        this.selectedSectionId.set(pendingSection);
      }
    });
  }

  onOverlayAttach(): void {
    if (!this.hasLoadedOnce) {
      this.startLoad();
      this.hasLoadedOnce = true;
    }
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

  retryLoad(): void {
    this.startLoad();
  }

  updatePosition(): void {
    // No-op: overlay is now a fixed pane rendered inside app-nav.
  }

  isSectionSelected(sectionId: string): boolean {
    return this.selectedSectionId() === sectionId;
  }

  setThemeMode(themeMode: ThemeMode): void {
    this.settingsModel.update((model) => ({ ...model, themeMode }));
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

  private startLoad(): void {
    this.loadState.set('loading');
    this.lastError.set(null);

    try {
      const user = this.authService.user();

      if (!user) {
        throw new Error(
          this.t('settings.overlay.error.noSession', 'No authenticated session found.'),
        );
      }

      this.loadState.set('populated');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : this.t('settings.overlay.error.generic', 'Unable to load settings right now.');
      this.lastError.set(message);
      this.loadState.set('error');
    }
  }

  private readMarkerMotionPreference(): MarkerMotionPreference {
    if (typeof window === 'undefined') return 'smooth';
    const stored = window.localStorage.getItem(MAP_MARKER_MOTION_STORAGE_KEY);
    return stored === 'off' ? 'off' : 'smooth';
  }
}
