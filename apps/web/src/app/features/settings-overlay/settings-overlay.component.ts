import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  runInInjectionContext,
  signal,
  viewChild,
} from '@angular/core';
import type { LanguageCode } from '../../core/i18n/translation-catalog';
import { I18nService } from '../../core/i18n/i18n.service';
import type { SettingsPaneSectionId } from '../../core/settings-pane/settings-pane.service';
import { SettingsPaneService } from '../../core/settings-pane/settings-pane.service';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import type { ToggleGroupOption } from '../../shared/ui/toggle-group/toggle-group-option.types';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../shared/ui/toggle-group';
import {
  toggleOptionLayout,
  toggleSingleStringValue,
} from '../../shared/ui/toggle-group/toggle-group-option.helpers';
import { HLM_INPUT_IMPORTS } from '../../shared/ui/input';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import { HLM_LABEL_IMPORTS } from '../../shared/ui/label';
import { HLM_SELECT_IMPORTS } from '../../shared/ui/select';
import { HLM_SWITCH_IMPORTS } from '../../shared/ui/switch';
import { InviteManagementSectionComponent } from './sections/invite-management-section.component';
import { SearchTuningSettingsSectionComponent } from './sections/search-tuning-settings-section.component';
import { AccountComponent } from '../../shared/account/account.component';
import { OrgSearchTuningService } from '../../core/search/org-search-tuning.service';
import {
  buildSettingsSectionList,
  buildSettingsSectionRegistry,
  filterSettingsSectionsForViewer,
  isKnownSettingsSectionId,
} from './settings-sections.const';
import {
  SETTINGS_SECTION_ANCHORS,
  settingsDetailAnchorDomId,
  type SettingsSectionAnchorDef,
} from './settings-section-anchors.const';
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
  cacheRetentionDays: number;
  telemetryEnabled: boolean;
}

type SettingsLoadState = 'loading' | 'error' | 'populated';

@Component({
  selector: 'ss-settings-overlay',
  standalone: true,
  imports: [
    ...BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
    InviteManagementSectionComponent,
    SearchTuningSettingsSectionComponent,
    AccountComponent,
    ...HLM_INPUT_IMPORTS,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_LABEL_IMPORTS,
    ...HLM_SELECT_IMPORTS,
    ...HLM_SWITCH_IMPORTS,
  ],
  templateUrl: './settings-overlay.component.html',
  styleUrl: './settings-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverlayComponent {
  /** Template helper: icon/text layout for pill toggle options. */
  readonly optLayout = toggleOptionLayout;

  private readonly i18nService = inject(I18nService);
  private readonly settingsPaneService = inject(SettingsPaneService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private highlightedSubsectionToken = 0;
  private tocHighlightToken = 0;
  /** Service-driven subsection scroll: only set after `findSubsectionElement` succeeds for this token. */
  private lastSuccessfulSubsectionRequestToken: number | null = null;

  readonly accountSection = viewChild(AccountComponent);
  readonly inviteSection = viewChild(InviteManagementSectionComponent);

  readonly open = input(false);
  readonly openChange = output<boolean>();
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private readonly sectionRegistry = buildSettingsSectionRegistry();

  readonly visibleSectionRegistry = computed(() =>
    filterSettingsSectionsForViewer(this.sectionRegistry, this.orgSearchTuning.isOrgAdmin()),
  );

  readonly sectionList = computed<ReadonlyArray<SettingsSection>>(() =>
    buildSettingsSectionList(this.t, this.orgSearchTuning.isOrgAdmin()),
  );

  /** Anchors for the detail-column TOC; keyed separately from rail `SettingsSection` list. */
  anchorsForSection(sectionId: string): readonly SettingsSectionAnchorDef[] {
    return SETTINGS_SECTION_ANCHORS[sectionId] ?? [];
  }

  /** Invite TOC: hide while child is missing or in error panel (anchors not in DOM). */
  readonly inviteManagementTocVisible = computed(() => {
    const invite = this.inviteSection();
    if (!invite) {
      return false;
    }
    return invite.panelMode() !== 'error';
  });

  readonly languageOptions: ReadonlyArray<ToggleGroupOption> = buildLanguageOptions();

  readonly densityOptions = computed<ReadonlyArray<ToggleGroupOption>>(() =>
    buildDensityOptions(this.t),
  );

  readonly themeModeOptions = computed<ReadonlyArray<ToggleGroupOption>>(() =>
    buildThemeModeOptions(this.t),
  );

  readonly markerMotionOptions = computed<ReadonlyArray<ToggleGroupOption>>(() =>
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
      const requestToken = subsectionRequest.requestToken;

      const accountRef = this.accountSection();
      const inviteRef = this.inviteSection();
      const accountLoading = accountRef?.loading() ?? false;
      const invitePanelMode = inviteRef?.panelMode();
      void accountLoading;
      void invitePanelMode;

      if (!open || !subsectionId) {
        this.lastSuccessfulSubsectionRequestToken = null;
        return;
      }

      if (this.lastSuccessfulSubsectionRequestToken === requestToken) {
        return;
      }

      if (selectedSectionId === 'account') {
        if (!accountRef || accountLoading) {
          return;
        }
      }

      if (selectedSectionId === 'invite-management') {
        if (!inviteRef || inviteRef.panelMode() === 'error') {
          return;
        }
      }

      const enableRafRetry =
        selectedSectionId === 'account' || selectedSectionId === 'invite-management';

      runInInjectionContext(this.injector, () => {
        afterNextRender(() => {
          this.tryScrollSubsectionWithOptionalRafRetry(
            selectedSectionId,
            subsectionId,
            requestToken,
            enableRafRetry,
            () => {
              this.lastSuccessfulSubsectionRequestToken = requestToken;
            },
          );
        });
      });
    });
  }

  /** Scroll + highlight from TOC buttons (same visual treatment as URL-driven subsection). */
  scrollToDetailAnchor(sectionId: string, subsectionSlug: string): void {
    const token = ++this.tocHighlightToken;
    const invite = this.inviteSection();
    void invite?.panelMode();

    if (sectionId === 'invite-management') {
      if (!invite || invite.panelMode() === 'error') {
        return;
      }
    }

    const enableRafRetry = sectionId === 'account' || sectionId === 'invite-management';

    runInInjectionContext(this.injector, () => {
      afterNextRender(() => {
        this.tryScrollSubsectionWithOptionalRafRetry(sectionId, subsectionSlug, token, enableRafRetry);
      });
    });
  }

  /** @internal Template helper for stable anchor ids. */
  readonly settingsAnchorDomId = settingsDetailAnchorDomId;

  onOverlayAttach(): void {
    void this.orgSearchTuning.bootstrapFromSession();
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
    if (!isKnownSettingsSectionId(sectionId, this.visibleSectionRegistry())) {
      return;
    }
    this.selectedSectionId.set(sectionId);
    this.settingsPaneService.setSelectedSection(sectionId as SettingsPaneSectionId);
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

  onLanguageValueChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'en' || value === 'de' || value === 'it') {
      this.setLanguage(value);
    }
  }

  onDensityValueChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'compact' || value === 'comfortable') {
      this.setDensity(value);
    }
  }

  onThemeModeValueChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'light' || value === 'dark' || value === 'system' || value === 'sandstone') {
      this.setThemeMode(value);
    }
  }

  onMarkerMotionValueChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (value === 'off' || value === 'smooth') {
      this.setMarkerMotion(value);
    }
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

  /**
   * Scroll + highlight; optional rAF chain for first-paint races (not a substitute for signal deps).
   * Invokes `onScrollSuccess` whenever a target is found and scrolled (sync or inside rAF).
   */
  private tryScrollSubsectionWithOptionalRafRetry(
    sectionId: string,
    subsectionSlug: string,
    highlightToken: number,
    enableRafRetry: boolean,
    onScrollSuccess?: () => void,
  ): void {
    const run = (): boolean => {
      const target = this.findSubsectionElement(sectionId, subsectionSlug);
      if (!target) {
        return false;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.highlightSubsection(target, highlightToken);
      onScrollSuccess?.();
      return true;
    };

    if (run()) {
      return;
    }
    if (!enableRafRetry || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      if (run()) {
        return;
      }
      requestAnimationFrame(() => {
        run();
      });
    });
  }

  private findSubsectionElement(sectionId: string, subsectionSlug: string): HTMLElement | null {
    const host = this.hostRef.nativeElement;
    const domId = settingsDetailAnchorDomId(sectionId, subsectionSlug);
    const byId = host.querySelector(`#${CSS.escape(domId)}`) as HTMLElement | null;
    if (byId) {
      return byId;
    }

    const candidates = host.querySelectorAll(
      '[data-settings-subsection]',
    ) as NodeListOf<HTMLElement>;

    for (const candidate of candidates) {
      const value = candidate.dataset['settingsSubsection'];
      if (value && value.toLowerCase() === subsectionSlug.toLowerCase()) {
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
