/**
 * Org admin search tuning settings — save FSM, discard, reset-to-defaults.
 * @see docs/specs/ui/search-bar/search-tuning-settings.md
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { OrgSearchTuningService } from '../../../core/search/org-search-tuning.service';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from '../../../core/search/search-tuning.defaults';
import type { SearchTuningValuesJson } from '../../../core/search/search-tuning.types';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';
import { HLM_LABEL_IMPORTS } from '../../../shared/ui/label';
import { HLM_SWITCH_IMPORTS } from '../../../shared/ui/switch';
import { RangeProgressStyleDirective } from '../../../shared/ui/range/range-progress-style.directive';

export type SearchTuningEditorMode = 'basic' | 'advanced';
export type SearchTuningSaveUiState = 'idle' | 'dirty' | 'saving' | 'saved' | 'save_error';

interface SearchTuningDraft {
  orchestrator: {
    debounceMs: number;
  };
  resolver: {
    enableInternetSearch: boolean;
    minQueryLength: number;
    maxGeocoderResults: number;
    contextDistanceMaxMeters: number;
    weakTopScoreThreshold: number;
  };
  query: {
    specificStreetMinLength: number;
  };
}

/** Exponential context-distance helpers — slider 0–100 maps to 0.5–2000 km */
const CTX_MIN_KM = 0.5;
const CTX_MAX_KM = 2000;
const CTX_RATIO = CTX_MAX_KM / CTX_MIN_KM; // 4000

function ctxSliderToKm(slider: number): number {
  return CTX_MIN_KM * Math.pow(CTX_RATIO, slider / 100);
}

function ctxKmToSlider(km: number): number {
  const clamped = Math.max(CTX_MIN_KM, Math.min(CTX_MAX_KM, km));
  return (Math.log(clamped / CTX_MIN_KM) / Math.log(CTX_RATIO)) * 100;
}

@Component({
  selector: 'ss-search-tuning-settings-section',
  standalone: true,
  imports: [
    ConfirmDialogComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    ...HLM_LABEL_IMPORTS,
    ...HLM_SWITCH_IMPORTS,
    RangeProgressStyleDirective,
  ],
  templateUrl: './search-tuning-settings-section.component.html',
  styleUrl: './search-tuning-settings-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'saveUiState()',
    class: 'search-tuning-settings',
  },
})
export class SearchTuningSettingsSectionComponent {
  private readonly i18n = inject(I18nService);
  private readonly orgTuning = inject(OrgSearchTuningService);

  readonly requestToken = input(0);

  readonly t = (key: string, fallback = '') => this.i18n.t(key, fallback);

  readonly editorMode = signal<SearchTuningEditorMode>('basic');
  readonly saveUiState = signal<SearchTuningSaveUiState>('idle');
  readonly resetConfirmOpen = signal(false);
  readonly lastError = signal<string | null>(null);

  private readonly persistedDraft = signal<SearchTuningDraft>(this.draftFromMergedConfig());
  readonly draft = signal<SearchTuningDraft>(this.draftFromMergedConfig());

  readonly isDirty = computed(
    () => JSON.stringify(this.draft()) !== JSON.stringify(this.persistedDraft()),
  );

  readonly canSave = computed(() => this.isDirty() && this.saveUiState() !== 'saving');

  constructor() {
    void this.orgTuning.bootstrapFromSession().then(() => {
      this.syncDraftFromService();
    });
  }

  setEditorMode(mode: SearchTuningEditorMode): void {
    this.editorMode.set(mode);
  }

  toggleEditorMode(): void {
    this.setEditorMode(this.editorMode() === 'advanced' ? 'basic' : 'advanced');
  }

  defaultDebounceMs(): number {
    return SEARCH_TUNING_SYSTEM_DEFAULTS.orchestrator.debounceMs;
  }

  defaultFor<K extends keyof SearchTuningDraft>(
    group: K,
    field: keyof SearchTuningDraft[K],
  ): number {
    // Access nested default via group/field path
    const g = group as string;
    const f = field as string;
    const defaults = SEARCH_TUNING_SYSTEM_DEFAULTS as unknown as Record<string, Record<string, number>>;
    return defaults[g]?.[f] ?? 0;
  }

  resetFieldToDefault<K extends keyof SearchTuningDraft>(
    group: K,
    field: keyof SearchTuningDraft[K],
  ): void {
    const defaultValue = this.defaultFor(group, field);
    this.draft.update((current) => ({
      ...current,
      [group]: { ...current[group], [field]: defaultValue },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  resetDebounceToDefault(): void {
    this.draft.update((d) => ({
      ...d,
      orchestrator: { ...d.orchestrator, debounceMs: SEARCH_TUNING_SYSTEM_DEFAULTS.orchestrator.debounceMs },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  resetContextDistanceToDefault(): void {
    this.draft.update((d) => ({
      ...d,
      resolver: { ...d.resolver, contextDistanceMaxMeters: SEARCH_TUNING_SYSTEM_DEFAULTS.resolver.contextDistanceMaxMeters },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  isFieldAtDefault<K extends keyof SearchTuningDraft>(
    group: K,
    field: keyof SearchTuningDraft[K],
  ): boolean {
    const current = (this.draft()[group] as Record<string, unknown>)[field as string];
    return current === this.defaultFor(group, field);
  }

  isDebounceAtDefault(): boolean {
    return this.draft().orchestrator.debounceMs === SEARCH_TUNING_SYSTEM_DEFAULTS.orchestrator.debounceMs;
  }

  isContextDistanceAtDefault(): boolean {
    return this.draft().resolver.contextDistanceMaxMeters === SEARCH_TUNING_SYSTEM_DEFAULTS.resolver.contextDistanceMaxMeters;
  }

  toggleInternetSearch(): void {
    const current = this.draft().resolver.enableInternetSearch;
    this.draft.update((d) => ({
      ...d,
      resolver: { ...d.resolver, enableInternetSearch: !current },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  onFieldChange<K extends keyof SearchTuningDraft>(
    group: K,
    field: keyof SearchTuningDraft[K],
    rawValue: string,
    min: number,
    max: number,
  ): void {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const numeric = Math.min(max, Math.max(min, parsed));
    this.draft.update((current) => ({
      ...current,
      [group]: { ...current[group], [field]: numeric },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  // ── Debounce helpers (internal: ms, display: seconds) ──────────────────────

  debounceMsToSeconds(ms: number): number {
    return Math.round(ms / 100) / 10;
  }

  onDebounceSecondsInput(rawSeconds: string): void {
    const s = Number(rawSeconds);
    if (!Number.isFinite(s)) return;
    const ms = Math.round(Math.min(5, Math.max(0.1, s)) * 1000);
    this.draft.update((d) => ({
      ...d,
      orchestrator: { ...d.orchestrator, debounceMs: ms },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  // ── Context distance helpers (internal: meters, display: km, slider: exponential) ──

  contextDistanceKm(): number {
    const km = this.draft().resolver.contextDistanceMaxMeters / 1000;
    return Math.round(km * 10) / 10;
  }

  contextDistanceSlider(): number {
    return Math.round(ctxKmToSlider(this.contextDistanceKm()));
  }

  onContextDistanceSliderChange(rawSlider: string): void {
    const v = Number(rawSlider);
    if (!Number.isFinite(v)) return;
    const km = ctxSliderToKm(Math.max(0, Math.min(100, v)));
    const meters = Math.round(km * 1000);
    this.draft.update((d) => ({
      ...d,
      resolver: { ...d.resolver, contextDistanceMaxMeters: meters },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  onContextDistanceKmInput(rawKm: string): void {
    const km = Number(rawKm);
    if (!Number.isFinite(km)) return;
    const clamped = Math.max(CTX_MIN_KM, Math.min(CTX_MAX_KM, km));
    this.draft.update((d) => ({
      ...d,
      resolver: { ...d.resolver, contextDistanceMaxMeters: Math.round(clamped * 1000) },
    }));
    this.saveUiState.set('dirty');
    this.lastError.set(null);
  }

  // ── Weak top score helpers (slider 0–100 = 0–1) ────────────────────────────

  weakTopScoreSliderPercent(): number {
    return Math.round(this.draft().resolver.weakTopScoreThreshold * 100);
  }

  onWeakTopScoreSliderChange(rawPercent: string): void {
    const percent = Number(rawPercent);
    if (!Number.isFinite(percent)) return;
    this.onFieldChange('resolver', 'weakTopScoreThreshold', String(percent / 100), 0, 1);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  discardChanges(): void {
    this.draft.set(structuredClone(this.persistedDraft()));
    this.saveUiState.set('idle');
    this.lastError.set(null);
  }

  openResetConfirm(): void {
    this.resetConfirmOpen.set(true);
  }

  closeResetConfirm(): void {
    this.resetConfirmOpen.set(false);
  }

  async confirmResetToDefaults(): Promise<void> {
    this.resetConfirmOpen.set(false);
    this.saveUiState.set('saving');
    this.lastError.set(null);
    try {
      await this.orgTuning.resetToDefaults();
      this.syncDraftFromService();
      this.saveUiState.set('saved');
    } catch (error) {
      this.lastError.set(error instanceof Error ? error.message : String(error));
      this.saveUiState.set('save_error');
    }
  }

  async saveChanges(): Promise<void> {
    const snapshot = structuredClone(this.persistedDraft());
    this.saveUiState.set('saving');
    this.lastError.set(null);
    try {
      const partial = this.buildPartialOverrides(this.draft(), snapshot);
      if (Object.keys(partial).length === 0) {
        this.saveUiState.set('idle');
        return;
      }
      await this.orgTuning.saveOrgProfile(partial);
      this.syncDraftFromService();
      this.saveUiState.set('saved');
    } catch (error) {
      this.draft.set(snapshot);
      this.lastError.set(error instanceof Error ? error.message : String(error));
      this.saveUiState.set('save_error');
    }
  }

  private syncDraftFromService(): void {
    const next = this.draftFromMergedConfig();
    this.persistedDraft.set(next);
    this.draft.set(structuredClone(next));
    this.saveUiState.set('idle');
  }

  private draftFromMergedConfig(): SearchTuningDraft {
    const merged = this.orgTuning.orgSearchConfig();
    return {
      orchestrator: { debounceMs: merged.orchestrator.debounceMs },
      resolver: {
        enableInternetSearch: merged.resolver.enableInternetSearch,
        minQueryLength: merged.resolver.minQueryLength,
        maxGeocoderResults: merged.resolver.maxGeocoderResults,
        contextDistanceMaxMeters: merged.resolver.contextDistanceMaxMeters,
        weakTopScoreThreshold: merged.resolver.weakTopScoreThreshold,
      },
      query: { specificStreetMinLength: merged.query.specificStreetMinLength },
    };
  }

  private buildPartialOverrides(
    next: SearchTuningDraft,
    persisted: SearchTuningDraft,
  ): SearchTuningValuesJson {
    const partial: SearchTuningValuesJson = {};

    if (next.orchestrator.debounceMs !== persisted.orchestrator.debounceMs) {
      partial.orchestrator = { debounceMs: next.orchestrator.debounceMs };
    }

    const resolverPatch: SearchTuningValuesJson['resolver'] = {};
    if (next.resolver.enableInternetSearch !== persisted.resolver.enableInternetSearch) {
      resolverPatch.enableInternetSearch = next.resolver.enableInternetSearch;
    }
    if (next.resolver.minQueryLength !== persisted.resolver.minQueryLength) {
      resolverPatch.minQueryLength = next.resolver.minQueryLength;
    }
    if (next.resolver.maxGeocoderResults !== persisted.resolver.maxGeocoderResults) {
      resolverPatch.maxGeocoderResults = next.resolver.maxGeocoderResults;
    }
    if (next.resolver.contextDistanceMaxMeters !== persisted.resolver.contextDistanceMaxMeters) {
      resolverPatch.contextDistanceMaxMeters = next.resolver.contextDistanceMaxMeters;
    }
    if (next.resolver.weakTopScoreThreshold !== persisted.resolver.weakTopScoreThreshold) {
      resolverPatch.weakTopScoreThreshold = next.resolver.weakTopScoreThreshold;
    }
    if (Object.keys(resolverPatch).length > 0) {
      partial.resolver = resolverPatch;
    }

    if (next.query.specificStreetMinLength !== persisted.query.specificStreetMinLength) {
      partial.query = { specificStreetMinLength: next.query.specificStreetMinLength };
    }

    return partial;
  }
}
