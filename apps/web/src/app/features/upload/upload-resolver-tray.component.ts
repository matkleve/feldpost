/**
 * Passive + active address disambiguation tray (shell sibling, OD-6).
 * @see docs/specs/component/upload/upload-resolver-tray.md
 */

import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadLocationResolutionService } from '../../core/upload/upload-location-resolution.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import { pickCollapseStage } from '../../core/upload/upload-location-resolution.helpers';
import type {
  UploadAddressCandidate,
  UploadDisambiguationGroup,
} from '../../core/upload/upload-manager.types';
import { ChipComponent } from '../../shared/components/chip/chip.component';
import { DropdownShellComponent } from '../../shared/dropdown-trigger/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import {
  extractStreetFromTitleAddress,
  formatCarouselIndicator,
  optionDisplayLabel,
  resolverQuestionKeyForGroup,
  resolverScoreBand,
  resolverScoreFillPercent,
} from './upload-resolver-tray.helpers';
import { UPLOAD_DEV_FLAGS } from './upload-dev-flags';
import {
  UPLOAD_RESOLVER_TRAY_MOCK_1B_CANDIDATES,
  UPLOAD_RESOLVER_TRAY_MOCK_GROUPS,
  UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES,
} from './upload-resolver-tray.mock';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

export interface AffectedMediaRow {
  jobId: string;
  label: string;
}

export type UploadResolverTrayMode = 'passive' | 'active' | 'hidden';

@Component({
  selector: 'app-upload-resolver-tray',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, ChipComponent, DropdownShellComponent],
  templateUrl: './upload-resolver-tray.component.html',
  styleUrl: './upload-resolver-tray.component.scss',
})
export class UploadResolverTrayComponent {
  private readonly i18n = inject(I18nService);
  private readonly resolution = inject(UploadLocationResolutionService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly panelSignals = inject(UploadPanelSignalsService);

  readonly panelOpen = input(false);
  readonly embeddedInPane = input(false);

  readonly candidateSelected = output<{ groupId: string; candidateId: string }>();
  readonly groupChanged = output<string>();
  readonly deferRequested = output<string>();
  readonly previewLocation = output<{ lat: number; lng: number }>();

  readonly t = this.i18n.t.bind(this.i18n);

  readonly passiveStatusLine = this.panelSignals.passiveStatusLine;

  private readonly useMockTray = UPLOAD_DEV_FLAGS.mockResolverTray;
  private readonly mockGroups = signal<UploadDisambiguationGroup[]>(
    structuredClone(UPLOAD_RESOLVER_TRAY_MOCK_GROUPS),
  );
  /** Mock carousel page (0-based); stable across ask-later when new cards are appended. */
  private readonly mockCarouselIndex = signal(0);
  /**
   * Pins carousel numerator when total grows but the active question stays (Ask later).
   * Cleared when the user moves to another card.
   */
  private readonly carouselPagePin = signal<number | null>(null);
  private readonly selectedCandidateId = signal<string | null>(null);
  readonly cityDraft = signal('');
  readonly manualHouseDraft = signal('');
  readonly manualHouseValidation = signal<'idle' | 'valid' | 'warn' | 'invalid'>('idle');
  readonly mediaMenuOpen = signal(false);
  readonly mediaMenuAnchor = signal<HTMLElement | null>(null);

  private readonly mediaChipTrigger = viewChild<ElementRef<HTMLElement>>('mediaChipTrigger');

  readonly openGroups = computed(() => {
    const groups = this.useMockTray
      ? this.mockGroups()
      : this.resolution.disambiguationGroups();
    return groups.filter((group) => group.resolutionGateOpen);
  });

  readonly affectedMedia = computed((): AffectedMediaRow[] => {
    const group = this.activeGroup();
    if (!group) {
      return [];
    }
    if (this.useMockTray) {
      return group.jobIds.map((jobId) => ({
        jobId,
        label: UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES[jobId] ?? jobId,
      }));
    }
    const jobs = this.uploadManager.jobs();
    return group.jobIds.map((jobId) => {
      const job = jobs.find((entry) => entry.id === jobId);
      return {
        jobId,
        label: job?.file.name ?? jobId,
      };
    });
  });

  /** 0-based carousel page; tracks mock index, service selection, or Ask-later pin. */
  readonly carouselPageIndex = computed(() => {
    const groups = this.openGroups();
    if (!groups.length) {
      return 0;
    }
    const pin = this.carouselPagePin();
    if (pin !== null) {
      return Math.min(Math.max(pin, 0), groups.length - 1);
    }
    if (this.useMockTray) {
      return Math.min(Math.max(this.mockCarouselIndex(), 0), groups.length - 1);
    }
    const selectedId = this.resolution.selectedGroupId();
    if (selectedId) {
      const selectedIndex = groups.findIndex((entry) => entry.id === selectedId);
      if (selectedIndex >= 0) {
        return selectedIndex;
      }
    }
    return 0;
  });

  /**
   * Single source of truth for tray UI (question, folder, options, media).
   * Always derived from `carouselPageIndex` so the header cannot desync from the card body.
   */
  readonly displayedGroup = computed(() => {
    const groups = this.openGroups();
    if (!groups.length) {
      return null;
    }
    return groups[this.carouselPageIndex()] ?? null;
  });

  /** @deprecated Alias — use `displayedGroup` for tray rendering. */
  readonly activeGroup = this.displayedGroup;

  readonly pendingGroupCount = computed(() =>
    this.useMockTray ? this.openGroups().length : this.resolution.pendingGroupCount(),
  );

  readonly activeGroupIndex = computed(() => this.carouselPageIndex());

  readonly canGoToPreviousGroup = computed(() => this.carouselPageIndex() > 0);
  readonly canGoToNextGroup = computed(
    () => this.carouselPageIndex() < this.openGroups().length - 1,
  );

  /** Visible label between chevrons, e.g. `1A/3`, `1B/3`, `2/3`. */
  readonly carouselIndicator = computed(() => {
    const groups = this.openGroups();
    const group = this.displayedGroup();
    return formatCarouselIndicator(
      this.carouselPageIndex(),
      groups.length,
      group?.trayStep,
    );
  });

  readonly canConfirmContinue = computed(() => {
    if (this.isCityStep()) {
      return this.cityDraft().trim().length > 0;
    }
    if (this.houseStepActive()) {
      return !!this.selectedOptionId();
    }
    return !!this.selectedOptionId();
  });

  readonly trayMode = computed<UploadResolverTrayMode>(() => {
    if (this.embeddedInPane()) {
      return 'hidden';
    }
    if (this.useMockTray && this.openGroups().length > 0) {
      return 'active';
    }
    if (this.pendingGroupCount() > 0) {
      return 'active';
    }
    if (UPLOAD_DEV_FLAGS.dockAlwaysVisible) {
      return 'passive';
    }
    return 'hidden';
  });

  readonly passiveDisplayLine = computed(() => {
    const line = this.passiveStatusLine();
    if (line) {
      return line;
    }
    if (UPLOAD_DEV_FLAGS.dockAlwaysVisible) {
      return this.t('upload.resolver.passive.devPreview', 'Upload tray visible (dev)');
    }
    return null;
  });

  readonly isCityStep = computed(() => {
    const group = this.activeGroup();
    return group?.disambiguationKind === 'city_step' || group?.trayStep === '1a';
  });

  readonly isHouseStep = computed(() => {
    const group = this.activeGroup();
    return group?.disambiguationKind === 'house_step' || group?.trayStep === '1b';
  });

  readonly houseStepActive = computed(() => {
    const group = this.activeGroup();
    return this.isHouseStep() && group?.step1bGate === 'active';
  });

  readonly resolverQuestion = computed(() => {
    const group = this.activeGroup();
    if (!group) {
      return '';
    }
    const key = resolverQuestionKeyForGroup(group);
    const fallbacks: Record<string, string> = {
      'upload.resolver.question.source': 'Use the folder address or the photo GPS?',
      'upload.resolver.question.contextDistance': 'Is this photo in the right project area?',
      'upload.resolver.question.cityStep': 'Which city is {street} in?',
      'upload.resolver.question.houseStep': 'No house number for {street} — what would you like?',
      'upload.resolver.question.projectAddressA':
        'Files without their own address found. Use project location or resolve yourself?',
      'upload.resolver.question.projectAddressB':
        'Use project address or file/folder address?',
      'upload.resolver.question.door': "What's the door number for {street}?",
      'upload.resolver.question.address': 'Which {address} do you mean?',
    };
    const template = this.t(key, fallbacks[key] ?? '');
    const street = extractStreetFromTitleAddress(group.titleAddress);
    const address =
      group.titleAddress.trim() ||
      this.t('upload.resolver.title.fallbackAddress', 'this address');
    return template.replace('{street}', street).replace('{address}', address);
  });

  readonly groupedCandidates = computed(() => {
    const group = this.activeGroup();
    if (!group) {
      return [];
    }
    if (this.isHouseStep() && group.houseNumberCandidates?.length) {
      return group.houseNumberCandidates.map((candidate) => ({
        label: candidate.addressLabel,
        candidates: [candidate],
      }));
    }
    if (group.disambiguationKind === 'source') {
      return group.candidates.map((candidate) => ({
        label: candidate.addressLabel,
        candidates: [candidate],
      }));
    }
    if (group.collapseStage === 'city') {
      const byCity = new Map<string, UploadAddressCandidate[]>();
      for (const candidate of group.candidates) {
        const key = (candidate.city ?? candidate.addressLabel).trim();
        const list = byCity.get(key) ?? [];
        list.push(candidate);
        byCity.set(key, list);
      }
      return Array.from(byCity.entries()).map(([label, candidates]) => ({
        label,
        candidates: candidates.slice(0, 1),
      }));
    }
    return group.candidates.map((candidate) => ({
      label: candidate.addressLabel,
      candidates: [candidate],
    }));
  });

  readonly numberedOptions = computed(() => {
    const group = this.activeGroup();
    const items: {
      index: number;
      label: string;
      candidate: UploadAddressCandidate;
    }[] = [];
    if (!group) {
      return items;
    }
    let index = 0;
    for (const row of this.groupedCandidates()) {
      for (const candidate of row.candidates) {
        index += 1;
        items.push({
          index,
          label: optionDisplayLabel(group, row.label, candidate),
          candidate,
        });
      }
    }
    return items;
  });

  readonly selectedOptionId = this.selectedCandidateId.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      this.carouselPageIndex();
      this.displayedGroup()?.id;
      const first = this.numberedOptions()[0]?.candidate.id ?? null;
      this.selectedCandidateId.set(first);
      this.mediaMenuOpen.set(false);
    });
    effect(() => {
      if (this.mediaMenuOpen()) {
        this.mediaMenuAnchor.set(this.mediaChipTrigger()?.nativeElement ?? null);
      }
    });

    if (typeof document !== 'undefined') {
      fromEvent<KeyboardEvent>(document, 'keydown', { capture: true })
        .pipe(
          filter(() => this.trayMode() === 'active'),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe((event) => this.onTrayKeydown(event));
    }
  }

  /** Capture-phase listener so map pan does not swallow ←/→ while the tray is active. */
  onTrayKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      this.goToAdjacentGroup(-1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      this.goToAdjacentGroup(1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmSelection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onDefer();
      return;
    }
    const option = this.optionForDigitKey(event.key);
    if (option) {
      event.preventDefault();
      this.selectOption(option.candidate.id);
      this.onPreviewCandidate(option.candidate);
    }
  }

  /** Digit keys 1–9 map to visible options (Cursor Questions shortcut). */
  private optionForDigitKey(key: string): { candidate: UploadAddressCandidate } | null {
    if (key.length !== 1 || key < '1' || key > '9') {
      return null;
    }
    const index = Number.parseInt(key, 10) - 1;
    const item = this.numberedOptions()[index];
    return item ?? null;
  }

  goToAdjacentGroup(delta: -1 | 1): void {
    const groups = this.openGroups();
    if (groups.length < 2) {
      return;
    }
    const nextIndex = this.carouselPageIndex() + delta;
    if (nextIndex < 0 || nextIndex >= groups.length) {
      return;
    }
    const next = groups[nextIndex];
    this.carouselPagePin.set(null);
    if (this.useMockTray) {
      this.mockCarouselIndex.set(nextIndex);
    } else {
      this.resolution.setSelectedGroupId(next.id);
    }
    this.groupChanged.emit(next.id);
  }

  selectOption(candidateId: string): void {
    this.selectedCandidateId.set(candidateId);
  }

  confirmSelection(): void {
    const group = this.activeGroup();
    if (group && this.isCityStep()) {
      void this.onConfirmCity();
      return;
    }
    const candidateId = this.selectedCandidateId();
    if (!candidateId) {
      return;
    }
    this.onSelectCandidate(candidateId);
  }

  async onConfirmCity(): Promise<void> {
    const group = this.activeGroup();
    const city = this.cityDraft().trim();
    if (!group || !city) {
      return;
    }
    if (this.useMockTray) {
      this.advanceMockGroup1aTo1b(group.id, city);
      this.cityDraft.set('');
      return;
    }
    await this.resolution.confirmTrayCity(group.id, city);
    this.cityDraft.set('');
    this.selectedCandidateId.set(null);
  }

  onStreetCentroid(): void {
    const group = this.activeGroup();
    if (!group) {
      return;
    }
    if (this.useMockTray) {
      this.advanceMockCarousel();
      return;
    }
    this.resolution.applyTrayHouseSelection(group.id, null, true);
  }

  onSelectCandidate(candidateId: string): void {
    const group = this.activeGroup();
    if (!group) {
      return;
    }
    const candidate = group.candidates.find((c) => c.id === candidateId);
    if (!candidate) {
      return;
    }
    this.candidateSelected.emit({ groupId: group.id, candidateId });
    if (this.useMockTray) {
      this.advanceMockCarousel();
      return;
    }
    const jobId = group.jobIds[0];
    if (!jobId) {
      return;
    }
    this.uploadManager.selectAddressCandidate(jobId, candidate);
  }

  onDefer(): void {
    const group = this.activeGroup();
    if (!group) {
      return;
    }
    this.deferRequested.emit(group.id);
    if (this.useMockTray) {
      this.advanceMockCarousel();
      return;
    }
    this.resolution.deferGroup(group.id);
  }

  /** Dev mock: move to next card after Skip / Continue (wraps to first). */
  private advanceMockCarousel(): void {
    const groups = this.openGroups();
    if (groups.length < 2) {
      return;
    }
    const nextIndex = (this.carouselPageIndex() + 1) % groups.length;
    this.carouselPagePin.set(null);
    this.mockCarouselIndex.set(nextIndex);
  }

  /** Dev mock: Step 1A city confirm → 1B house list on the same carousel card. */
  private advanceMockGroup1aTo1b(groupId: string, city: string): void {
    const houseCandidates = UPLOAD_RESOLVER_TRAY_MOCK_1B_CANDIDATES.map(
      (entry: UploadAddressCandidate) => ({
        ...entry,
        city,
      }),
    );
    this.mockGroups.update((groups) =>
      groups.map((entry) =>
        entry.id === groupId
          ? {
              ...entry,
              trayStep: '1b' as const,
              disambiguationKind: 'house_step' as const,
              step1bGate: 'active' as const,
              confirmedCity: city,
              candidates: houseCandidates,
              houseNumberCandidates: houseCandidates,
              collapseStage: pickCollapseStage(houseCandidates, entry.jobIds.length),
            }
          : entry,
      ),
    );
    const first = houseCandidates[0]?.id ?? null;
    this.selectedCandidateId.set(first);
  }

  onPreviewCandidate(candidate: UploadAddressCandidate): void {
    this.previewLocation.emit({ lat: candidate.lat, lng: candidate.lng });
  }

  toggleMediaMenu(): void {
    this.mediaMenuOpen.update((open) => !open);
  }

  openMediaMenu(): void {
    this.mediaMenuOpen.set(true);
  }

  closeMediaMenu(): void {
    this.mediaMenuOpen.set(false);
  }

  onAskLater(jobId: string, event: Event): void {
    event.stopPropagation();
    const group = this.activeGroup();
    if (!group) {
      return;
    }
    this.closeMediaMenu();
    const stayIndex = this.carouselPageIndex();
    if (this.useMockTray) {
      this.isolateMockJob(group.id, jobId, stayIndex);
      return;
    }
    this.resolution.isolateJobFromGroup(group.id, jobId);
    this.carouselPagePin.set(stayIndex);
  }

  private isolateMockJob(groupId: string, jobId: string, stayIndex: number): void {
    const group = this.mockGroups().find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }
    const remaining = group.jobIds.filter((id) => id !== jobId);

    this.mockGroups.update((groups) => {
      const next = structuredClone(groups);
      const index = next.findIndex((entry) => entry.id === groupId);
      if (index < 0) {
        return next;
      }
      const current = next[index];
      if (remaining.length > 0) {
        next[index] = {
          ...current,
          jobIds: remaining,
          collapseStage: pickCollapseStage(current.candidates, remaining.length),
        };
      } else {
        next.splice(index, 1);
      }
      next.push({
        ...current,
        id: `mock-isolate-${jobId}`,
        queryKey: `${current.queryKey}::${jobId}`,
        jobIds: [jobId],
        collapseStage: pickCollapseStage(current.candidates, 1),
      });
      return next;
    });

    this.carouselPagePin.set(stayIndex);
    this.mockCarouselIndex.set(stayIndex);
  }

  folderPathTitle(path: string): string {
    return this.t('upload.resolver.folder.aria', 'Upload folder: {path}').replace('{path}', path);
  }

  mediaCountLabel(count: number): string {
    return this.t('upload.resolver.mediaCount', '{count} media').replace(
      '{count}',
      String(count),
    );
  }

  mediaChipTitle(count: number): string {
    return this.t(
      'upload.resolver.media.chip.title',
      '{count} media in this group — open list',
    ).replace('{count}', String(count));
  }

  mediaChipAria(count: number): string {
    return this.mediaChipTitle(count);
  }

  mediaListAria(): string {
    return this.t('upload.resolver.media.list.aria', 'Media in this address group');
  }

  askLaterAria(label: string): string {
    return this.t(
      'upload.resolver.media.askLater.aria',
      'Resolve {name} in its own question',
    ).replace('{name}', label);
  }

  formatScorePercent(score: number | undefined): string | null {
    if (score === undefined || Number.isNaN(score)) {
      return null;
    }
    return `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;
  }

  scoreBand(score: number | undefined) {
    return resolverScoreBand(score);
  }

  scoreFillPercent(score: number | undefined): number {
    return resolverScoreFillPercent(score);
  }

  carouselPositionAria(): string | null {
    const indicator = this.carouselIndicator();
    if (!indicator) {
      return null;
    }
    const [current, total] = indicator.split('/');
    return this.t('upload.resolver.carousel.position', 'Address issue {current} of {total}')
      .replace('{current}', current ?? '')
      .replace('{total}', total ?? '');
  }

  optionAriaLabel(item: {
    index: number;
    label: string;
    candidate: UploadAddressCandidate;
  }): string {
    const percent = this.formatScorePercent(item.candidate.score);
    if (percent) {
      return this.t('upload.resolver.option.ariaWithScore', 'Option {index}: {label}, {score} match')
        .replace('{index}', String(item.index))
        .replace('{label}', item.label)
        .replace('{score}', percent);
    }
    return this.t('upload.resolver.option.aria', 'Option {index}: {label}')
      .replace('{index}', String(item.index))
      .replace('{label}', item.label);
  }
}
