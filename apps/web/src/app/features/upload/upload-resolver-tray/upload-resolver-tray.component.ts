/**
 * Passive + active address disambiguation tray (shell sibling, OD-6).
 * @see docs/specs/component/upload/upload-resolver-tray.md
 * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md
 */

import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadManagerService } from '../../../core/upload/upload-manager.service';
import { areAllJobsReadyForTrayResolution } from '../../../core/upload/address-resolution/upload-tray-resolution-gate.helpers';
import { UploadLocationResolutionService } from '../../../core/upload/location/upload-location-resolution.service';
import {
  countDialogueUnits,
  formatBundleCarouselIndicator,
  unitIndexForItem,
} from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.helpers';
import { UploadResolverTrayOrchestratorService } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import type {
  TrayResolveItem,
  TrayResolveOption,
} from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';
import { ChipComponent } from '../../../shared/components/chip/chip.component';
import { DropdownShellComponent } from '../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import {
  resolverScoreBand,
  resolverScoreFillPercent,
} from './upload-resolver-tray.helpers';
import { UPLOAD_DEV_FLAGS } from '../upload-dev-flags';
import { environment } from '../../../../environments/environment';
import {
  MOCK_ORCHESTRATOR_BATCH_ID,
  UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES,
  UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS,
} from './upload-resolver-tray.mock-orchestrator';
import { UploadPanelSignalsService } from '../upload-panel/upload-panel-signals.service';
import {
  deriveUploadResolverTrayVisualState,
  disambiguationGroupIdFromTrayItem,
  liveTrayJobIds,
  type UploadResolverTrayVisualState,
} from './upload-resolver-tray-state';

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
export class UploadResolverTrayComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly orchestrator = inject(UploadResolverTrayOrchestratorService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly locationResolution = inject(UploadLocationResolutionService);
  private readonly panelSignals = inject(UploadPanelSignalsService);

  readonly panelOpen = input(false);
  readonly embeddedInPane = input(false);

  readonly candidateSelected = output<{ groupId: string; candidateId: string }>();
  readonly groupChanged = output<string>();
  readonly deferRequested = output<string>();
  readonly previewLocation = output<{
    lat: number;
    lng: number;
    points?: ReadonlyArray<{ lat: number; lng: number }>;
  }>();
  readonly previewLocationCleared = output<void>();

  readonly t = this.i18n.t.bind(this.i18n);

  readonly passiveStatusLine = this.panelSignals.passiveStatusLine;

  private readonly _selectedOptionId = signal<string | null>(null);
  readonly cityDraft = signal('');
  readonly mediaMenuOpen = signal(false);
  readonly mediaMenuAnchor = signal<HTMLElement | null>(null);

  private readonly mediaChipTrigger = viewChild<ElementRef<HTMLElement>>('mediaChipTrigger');

  readonly activeItem = computed(() => this.orchestrator.activeItem());

  readonly bundleItems = computed(() => this.orchestrator.activeItems());

  readonly activeItemStatus = computed(() => {
    const item = this.activeItem();
    if (!item) {
      return 'ready' as const;
    }
    return this.orchestrator.itemStatuses().get(item.id) ?? 'ready';
  });

  readonly isItemBlocked = computed(() => this.trayVisualState() === 'blocked');

  readonly trayVisualState = computed((): UploadResolverTrayVisualState =>
    deriveUploadResolverTrayVisualState(this.activeItem(), this.activeItemStatus()),
  );

  readonly showTextAnswer = computed(() => this.trayVisualState() === 'text_answer');

  readonly showHouseNoNumber = computed(() => this.trayVisualState() === 'house_step');

  readonly carouselIndicator = computed(() => {
    const items = this.bundleItems();
    const item = this.activeItem();
    if (!items.length || !item) {
      return null;
    }
    const unitTotal = countDialogueUnits(items);
    if (unitTotal < 2) {
      return null;
    }
    const unitIndex = unitIndexForItem(items, item.id);
    return formatBundleCarouselIndicator(unitIndex, unitTotal, item.trayStepLabel);
  });

  readonly canGoToPreviousGroup = computed(() => this.orchestrator.activeItemIndex() > 0);

  readonly canGoToNextGroup = computed(() => {
    const items = this.bundleItems();
    return this.orchestrator.activeItemIndex() < items.length - 1;
  });

  readonly resolverQuestion = computed(() => {
    const item = this.activeItem();
    if (!item) {
      return '';
    }
    return this.questionForItem(item);
  });

  readonly numberedOptions = computed(() => {
    const item = this.activeItem();
    if (!item?.options.length) {
      return [] as { index: number; label: string; option: TrayResolveOption }[];
    }
    return item.options.map((option, index) => ({
      index: index + 1,
      label:
        item.questionKey === 'upload.resolver.question.source'
          ? this.sourceOptionLabel(option)
          : this.optionDisplayLabel(option),
      option,
    }));
  });

  readonly affectedMedia = computed((): AffectedMediaRow[] => {
    const item = this.activeItem();
    if (!item) {
      return [];
    }
    if (!environment.production && UPLOAD_DEV_FLAGS.mockResolverTray) {
      return item.jobIds.map((jobId) => ({
        jobId,
        label: UPLOAD_RESOLVER_TRAY_MOCK_MEDIA_NAMES[jobId] ?? jobId,
      }));
    }
    const jobs = this.uploadManager.jobs();
    const findJob = (id: string) => jobs.find((entry) => entry.id === id);
    return liveTrayJobIds(item.jobIds, findJob).map((jobId) => {
      const job = findJob(jobId)!;
      return { jobId, label: job.file.name };
    });
  });

  readonly canConfirmContinue = computed(() => {
    if (this.isItemBlocked()) {
      return false;
    }
    if (!this._selectedOptionId() && !this.showTextAnswer()) {
      return false;
    }
    if (this.showTextAnswer() && this.cityDraft().trim().length === 0) {
      return false;
    }
    const item = this.activeItem();
    const liveIds = item
      ? liveTrayJobIds(item.jobIds, (id) => this.uploadManager.jobs().find((entry) => entry.id === id))
      : [];
    if (!liveIds.length) {
      return false;
    }
    if (
      !areAllJobsReadyForTrayResolution(
        liveIds,
        (id) => this.uploadManager.jobs().find((entry) => entry.id === id),
        { questionKey: item?.questionKey, answerKind: item?.answerKind },
      )
    ) {
      return false;
    }
    if (item?.questionKey === 'upload.resolver.question.source') {
      return liveIds.every((jobId) => {
        const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
        return (
          job != null &&
          (job.titleAddressCoords != null || job.parsedExif?.coords != null)
        );
      });
    }
    return true;
  });

  readonly continueLabel = computed(() => {
    const items = this.bundleItems();
    const item = this.activeItem();
    if (!item || !items.length) {
      return this.t('upload.resolver.next', 'Next');
    }
    const unitTotal = countDialogueUnits(items);
    const unitIndex = unitIndexForItem(items, item.id) + 1;
    const hasMoreInBundle = unitIndex < unitTotal;
    const moreCarouselSteps = this.orchestrator.activeItemIndex() < items.length - 1;
    // Next while more bundles queued; Save on last dialogue unit — @see upload-resolver-tray.question-copy.md § Footer
    if (hasMoreInBundle || moreCarouselSteps || this.orchestrator.pendingBundleCount() > 0) {
      return this.t('upload.resolver.next', 'Next');
    }
    return this.t('upload.resolver.save', 'Save');
  });

  readonly folderParsedSubtitle = computed(() => {
    const item = this.activeItem();
    if (item?.questionKey !== 'upload.resolver.question.source') {
      return null;
    }
    const parsed = item.questionParams['parsedAddress']?.trim();
    return parsed
      ? this.t('upload.resolver.folder.parsed', 'Parsed from folder: {address}').replace(
          '{address}',
          parsed,
        )
      : null;
  });

  readonly trayMode = computed<UploadResolverTrayMode>(() => {
    if (this.embeddedInPane()) {
      return 'hidden';
    }
    if (this.orchestrator.hasActivePresentation()) {
      return 'active';
    }
    if (this.orchestrator.hasPresentationBacklog() && !this.panelOpen()) {
      return 'passive';
    }
    if (!environment.production && UPLOAD_DEV_FLAGS.mockResolverTray) {
      return 'hidden';
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

  readonly selectedOptionId = this._selectedOptionId.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);

    effect(() => {
      this.activeItem()?.id;
      const first = this.numberedOptions()[0]?.option.id ?? null;
      this._selectedOptionId.set(first);
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

  ngOnInit(): void {
    if (!environment.production && UPLOAD_DEV_FLAGS.mockResolverTray) {
      this.orchestrator.resetAll();
      this.orchestrator.presentBundleImmediately(
        MOCK_ORCHESTRATOR_BATCH_ID,
        structuredClone(UPLOAD_RESOLVER_TRAY_MOCK_ORCHESTRATOR_ITEMS),
      );
    }
  }

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
      this.selectOption(option.option.id);
      this.onPreviewOption(option.option);
    }
  }

  goToAdjacentGroup(delta: -1 | 1): void {
    this.orchestrator.goToAdjacentItem(delta);
    const item = this.orchestrator.activeItem();
    if (item) {
      this.groupChanged.emit(item.id);
    }
  }

  selectOption(optionId: string): void {
    this._selectedOptionId.set(optionId);
  }

  confirmSelection(): void {
    if (this.isItemBlocked()) {
      return;
    }
    if (this.showTextAnswer()) {
      const city = this.cityDraft().trim();
      if (!city) {
        return;
      }
      this.orchestrator.resolveActiveItem({ text: city });
      this.cityDraft.set('');
      return;
    }
    const optionId = this._selectedOptionId();
    if (!optionId) {
      return;
    }
    this.orchestrator.resolveActiveItem({ optionId });
  }

  onDefer(): void {
    const item = this.activeItem();
    this.orchestrator.skipActiveItem();
    if (item) {
      this.deferRequested.emit(item.id);
    }
  }

  onStreetCentroid(): void {
    if (this.isItemBlocked()) {
      return;
    }
    const item = this.activeItem();
    const groupId = disambiguationGroupIdFromTrayItem(item);
    if (groupId) {
      this.locationResolution.applyTrayHouseSelection(groupId, null, true);
    }
    this.orchestrator.resolveActiveItem({});
  }

  onPreviewOption(option: TrayResolveOption): void {
    if (option.id === 'source-none') {
      this.previewLocationCleared.emit();
      return;
    }
    const item = this.activeItem();
    if (option.id === 'source-both' && item?.questionKey === 'upload.resolver.question.source') {
      const text = item.options.find((o) => o.id === 'source-text');
      const exif = item.options.find((o) => o.id === 'source-exif');
      const points = [text, exif]
        .filter((o): o is TrayResolveOption => !!o && this.optionHasPreviewCoords(o))
        .map((o) => ({ lat: o.lat!, lng: o.lng! }));
      if (points.length) {
        this.previewLocation.emit({ lat: points[0]!.lat, lng: points[0]!.lng, points });
        return;
      }
    }
    if (this.optionHasPreviewCoords(option)) {
      this.previewLocation.emit({ lat: option.lat!, lng: option.lng! });
    } else {
      this.previewLocationCleared.emit();
    }
  }

  private optionHasPreviewCoords(option: TrayResolveOption): boolean {
    return (
      option.id !== 'source-none' &&
      option.lat !== undefined &&
      option.lng !== undefined &&
      Number.isFinite(option.lat) &&
      Number.isFinite(option.lng)
    );
  }

  onOptionHoverEnd(): void {
    this.previewLocationCleared.emit();
  }

  toggleMediaMenu(): void {
    this.mediaMenuOpen.update((open) => !open);
  }

  closeMediaMenu(): void {
    this.mediaMenuOpen.set(false);
  }

  onAskLater(jobId: string, event: Event): void {
    event.stopPropagation();
    const item = this.activeItem();
    const groupId = disambiguationGroupIdFromTrayItem(item);
    if (groupId) {
      this.locationResolution.isolateJobFromGroup(groupId, jobId);
    }
    this.closeMediaMenu();
  }

  folderPathTitle(path: string): string {
    return this.t('upload.resolver.folder.aria', 'Upload folder: {path}').replace('{path}', path);
  }

  mediaCountLabel(count: number): string {
    return this.t('upload.resolver.mediaCount', '{count} media').replace('{count}', String(count));
  }

  mediaChipTitle(count: number): string {
    return this.t('upload.resolver.media.chip.title', '{count} media in this group — open list')
      .replace('{count}', String(count));
  }

  mediaChipAria(count: number): string {
    return this.mediaChipTitle(count);
  }

  mediaListAria(): string {
    return this.t('upload.resolver.media.list.aria', 'Media in this address group');
  }

  askLaterAria(label: string): string {
    return this.t('upload.resolver.media.askLater.aria', 'Resolve {name} in its own question').replace(
      '{name}',
      label,
    );
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
    option: TrayResolveOption;
  }): string {
    const percent = this.formatScorePercent(item.option.score);
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

  private optionForDigitKey(key: string): { option: TrayResolveOption } | null {
    if (key.length !== 1 || key < '1' || key > '9') {
      return null;
    }
    const index = Number.parseInt(key, 10) - 1;
    const item = this.numberedOptions()[index];
    return item ? { option: item.option } : null;
  }

  private optionDisplayLabel(option: TrayResolveOption): string {
    if (!option.labelKey) {
      return option.label;
    }
    let text = this.t(option.labelKey, option.label);
    if (option.labelParams) {
      for (const [key, value] of Object.entries(option.labelParams)) {
        text = text.replace(`{${key}}`, value);
      }
    }
    return text;
  }

  sourceOptionLabel(option: TrayResolveOption): string {
    const address = option.label.trim();
    switch (option.id) {
      case 'source-text':
        return this.t('upload.resolver.source.option.folder', 'Folder address: {address}').replace(
          '{address}',
          address,
        );
      case 'source-exif':
        return this.t('upload.resolver.source.option.photo', 'Photo location: {address}').replace(
          '{address}',
          address,
        );
      case 'source-both':
        return this.t('upload.resolver.source.option.both', 'Add both locations to file');
      case 'source-none':
        return this.t('upload.resolver.source.option.none', 'Set later in file details');
      default:
        return option.label;
    }
  }

  private questionForItem(item: TrayResolveItem): string {
    const fallbacks: Record<string, string> = {
      'upload.resolver.question.source':
        'Photo GPS is far from the folder name ({distance}). Which location should we use?',
      'upload.resolver.question.contextDistance': 'Is this photo in the right project area?',
      'upload.resolver.question.cityStep': 'Which city is {street} in?',
      'upload.resolver.question.houseStep': 'No house number for {street} — what would you like?',
      'upload.resolver.question.projectAddressA':
        'Files without their own address found. Use project location or resolve yourself?',
      'upload.resolver.question.projectAddressB':
        'Use project address or file/folder address?',
      'upload.resolver.question.door': "What's the door number for {street}?",
      'upload.resolver.question.address': 'Which {address} do you mean?',
      'upload.resolver.question.city': 'Which city is {street} in?',
    };
    const template = this.t(item.questionKey, fallbacks[item.questionKey] ?? '');
    return template
      .replace('{street}', item.questionParams['street'] ?? '')
      .replace('{address}', item.questionParams['address'] ?? '')
      .replace('{distance}', item.questionParams['distance'] ?? '');
  }

}
