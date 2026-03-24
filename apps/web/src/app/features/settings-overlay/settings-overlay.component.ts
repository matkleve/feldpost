import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { LanguageCode } from '../../core/i18n/translation-catalog';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsPaneService } from '../../core/settings-pane.service';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../shared/segmented-switch/segmented-switch.component';
import { UI_PRIMITIVE_DIRECTIVES } from '../../shared/ui-primitives/ui-primitives.directive';
import { InviteManagementSectionComponent } from './sections/invite-management-section.component';
import { AccountComponent } from '../../shared/account/account.component';
import { buildSettingsSectionList } from './settings-sections.const';
import {
  buildLanguageOptions,
  buildDensityOptions,
  buildThemeModeOptions,
  buildMarkerMotionOptions,
} from './settings-options.const';

type ThemeMode = 'light' | 'dark' | 'system' | 'sandstone';

type DensityMode = 'compact' | 'comfortable';

type SearchBias = 'balanced' | 'address-first' | 'place-first';

type MarkerMotionPreference = 'off' | 'smooth';

const MAP_MARKER_MOTION_STORAGE_KEY = 'feldpost.settings.map.markerMotion';
const MAP_MARKER_MOTION_EVENT = 'feldpost:map-marker-motion-changed';
const THEME_MODE_STORAGE_KEY = 'feldpost.settings.themeMode';
const SUBSECTION_HIGHLIGHT_DURATION_MS = 1800;

export interface SettingsSection {
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
  imports: [
    SegmentedSwitchComponent,
    InviteManagementSectionComponent,
    AccountComponent,
    ...UI_PRIMITIVE_DIRECTIVES,
  ],
  templateUrl: './settings-overlay.component.html',
  styleUrl: './settings-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverlayComponent {
  private readonly i18nService = inject(I18nService);
  private readonly settingsPaneService = inject(SettingsPaneService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private highlightedSubsectionToken = 0;

  readonly open = input(false);
  readonly openChange = output<boolean>();
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly sectionList = computed<ReadonlyArray<SettingsSection>>(() =>
    buildSettingsSectionList(this.t),
  );

  readonly languageOptions: ReadonlyArray<SegmentedSwitchOption> = buildLanguageOptions();

  readonly densityOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() =>
    buildDensityOptions(this.t),
  );

  readonly themeModeOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() =>
    buildThemeModeOptions(this.t),
  );

  readonly markerMotionOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() =>
    buildMarkerMotionOptions(this.t),
  );

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

    effect(() => {
      const subsectionRequest = this.settingsPaneService.subsectionRequest();
      const selectedSectionId = this.selectedSectionId();
      const open = this.open();
      const subsectionId = subsectionRequest.id;

      if (!open || !subsectionId || selectedSectionId !== 'account') {
        return;
      }

      queueMicrotask(() => {
        this.scrollToSubsection(subsectionId, subsectionRequest.requestToken);
      });
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

  onLanguageValueChange(value: string | null): void {
    if (value === 'en' || value === 'de' || value === 'it') {
      this.setLanguage(value);
    }
  }

  onDensityValueChange(value: string | null): void {
    if (value === 'compact' || value === 'comfortable') {
      this.setDensity(value);
    }
  }

  onThemeModeValueChange(value: string | null): void {
    if (value === 'light' || value === 'dark' || value === 'system' || value === 'sandstone') {
      this.setThemeMode(value);
    }
  }

  onMarkerMotionValueChange(value: string | null): void {
    if (value === 'off' || value === 'smooth') {
      this.setMarkerMotion(value);
    }
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

  private scrollToSubsection(subsectionId: string, requestToken: number): void {
    const target = this.findSubsectionElement(subsectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.highlightSubsection(target, requestToken);
  }

  private findSubsectionElement(subsectionId: string): HTMLElement | null {
    const host = this.hostRef.nativeElement;
    const candidates = host.querySelectorAll(
      '[data-settings-subsection]',
    ) as NodeListOf<HTMLElement>;

    for (const candidate of candidates) {
      const value = candidate.dataset['settingsSubsection'];
      if (value && value.toLowerCase() === subsectionId.toLowerCase()) {
        return candidate;
      }
    }

    return null;
  }

  private highlightSubsection(target: HTMLElement, requestToken: number): void {
    const activeToken = Math.max(requestToken, this.highlightedSubsectionToken + 1);
    this.highlightedSubsectionToken = activeToken;

    target.classList.remove('settings-overlay__subsection-highlight');
    // Force reflow so repeated deep-links replay the highlight animation.
    void target.offsetWidth;
    target.classList.add('settings-overlay__subsection-highlight');

    setTimeout(() => {
      if (this.highlightedSubsectionToken !== activeToken) {
        return;
      }

      target.classList.remove('settings-overlay__subsection-highlight');
    }, SUBSECTION_HIGHLIGHT_DURATION_MS);
  }
}
