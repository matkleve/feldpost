import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  ConnectedPosition,
  OverlayModule,
} from '@angular/cdk/overlay';
import { AuthService } from '../../core/auth.service';

type SettingsLoadState = 'loading' | 'error' | 'populated';

type ThemeMode = 'light' | 'dark' | 'system';

type DensityMode = 'compact' | 'comfortable';

type SearchBias = 'balanced' | 'address-first' | 'place-first';

interface SettingsSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

interface SettingsModel {
  themeMode: ThemeMode;
  density: DensityMode;
  language: 'en' | 'de';
  notificationsEnabled: boolean;
  uploadFailureAlerts: boolean;
  mapAutoLocate: boolean;
  mapGridOverlay: boolean;
  searchBias: SearchBias;
  searchRadiusKm: number;
  cacheRetentionDays: number;
  telemetryEnabled: boolean;
}

@Component({
  selector: 'ss-settings-overlay',
  standalone: true,
  imports: [OverlayModule],
  templateUrl: './settings-overlay.component.html',
  styleUrl: './settings-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverlayComponent {
  private readonly authService = inject(AuthService);
  private hasLoadedOnce = false;

  readonly origin = input.required<CdkOverlayOrigin>();
  readonly open = input(false);
  readonly openChange = output<boolean>();
  readonly panelClass = 'settings-overlay-panel';

  readonly overlayRef = viewChild(CdkConnectedOverlay);

  readonly sectionList: ReadonlyArray<SettingsSection> = [
    {
      id: 'general',
      icon: 'tune',
      title: 'General',
      subtitle: 'Language, density, and defaults',
    },
    {
      id: 'appearance',
      icon: 'palette',
      title: 'Appearance',
      subtitle: 'Theme and visual behavior',
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'Notifications',
      subtitle: 'In-app status and alerts',
    },
    {
      id: 'map',
      icon: 'map',
      title: 'Map Preferences',
      subtitle: 'Map behaviors and helper layers',
    },
    {
      id: 'search',
      icon: 'manage_search',
      title: 'Search Tuning',
      subtitle: 'Ranking and fallback tuning',
    },
    {
      id: 'data',
      icon: 'storage',
      title: 'Data and Privacy',
      subtitle: 'Retention and telemetry',
    },
    {
      id: 'account',
      icon: 'person',
      title: 'Account',
      subtitle: 'Identity and sign-in context',
    },
  ];

  readonly selectedSectionId = signal<string>(this.sectionList[0].id);
  readonly loadState = signal<SettingsLoadState>('loading');
  readonly lastError = signal<string | null>(null);

  readonly settingsModel = signal<SettingsModel>({
    themeMode: 'system',
    density: 'comfortable',
    language: 'en',
    notificationsEnabled: true,
    uploadFailureAlerts: true,
    mapAutoLocate: false,
    mapGridOverlay: false,
    searchBias: 'balanced',
    searchRadiusKm: 2,
    cacheRetentionDays: 30,
    telemetryEnabled: false,
  });

  readonly userDisplayName = computed(() => {
    const user = this.authService.user();
    const fullName = user?.user_metadata?.['full_name'];

    if (typeof fullName === 'string' && fullName.trim().length > 0) {
      return fullName.trim();
    }

    const email = user?.email;
    if (typeof email === 'string' && email.length > 0) {
      return email;
    }

    return 'Unknown user';
  });

  readonly userEmail = computed(() => {
    const email = this.authService.user()?.email;
    return typeof email === 'string' && email.length > 0 ? email : 'No email available';
  });

  readonly positions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'center',
      offsetX: 12,
    },
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
      offsetX: 12,
    },
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetX: 12,
    },
  ];

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
  }

  retryLoad(): void {
    this.startLoad();
  }

  updatePosition(): void {
    this.overlayRef()?.overlayRef.updatePosition();
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

  setLanguage(language: 'en' | 'de'): void {
    this.settingsModel.update((model) => ({ ...model, language }));
  }

  setSearchBias(searchBias: SearchBias): void {
    this.settingsModel.update((model) => ({ ...model, searchBias }));
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
        throw new Error('No authenticated session found.');
      }

      this.loadState.set('populated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load settings right now.';
      this.lastError.set(message);
      this.loadState.set('error');
    }
  }
}
