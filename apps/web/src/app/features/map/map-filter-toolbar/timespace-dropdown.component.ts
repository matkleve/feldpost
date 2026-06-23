import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MapTimespaceCatalogService } from '../../../core/map-timespace/map-timespace-catalog.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import {
  buildTimespaceHistogram,
  clickBandRange,
  dragRange,
  isTimeRangeActive,
  matchesTimeRange,
  ratioFromClientXInInsetBox,
  selectionOverlayPercents,
  type TimeRange,
  type TimespaceBin,
} from '../../../core/workspace-view/timespace.helpers';
import { toIsoDateValue, parseIsoDateValue } from '../../../core/i18n/date-field.helpers';
import { CalendarDropdownComponent } from '../../../shared/calendar-dropdown/calendar-dropdown.component';
import type { CalendarRangeValue } from '../../../shared/calendar-dropdown/calendar-dropdown.types';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';

@Component({
  selector: 'app-timespace-dropdown',
  standalone: true,
  imports: [CalendarDropdownComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './timespace-dropdown.component.html',
  styleUrl: './timespace-dropdown.component.scss',
  host: {
    class: 'timespace-dropdown',
    role: 'group',
    '[attr.lang]': 'dateInputLocale()',
    '[attr.aria-label]': 'groupAriaLabel()',
  },
})
export class TimespaceDropdownComponent implements OnInit {
  private readonly i18nService = inject(I18nService);
  private readonly viewService = inject(WorkspaceViewService);
  protected readonly catalog = inject(MapTimespaceCatalogService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  readonly groupAriaLabel = () => this.t('map.filter.timespace.aria', 'Time range');

  /** BCP-47 locale for date fields. */
  readonly dateInputLocale = this.i18nService.locale;

  /** Pixel height of the histogram bar track — bars use explicit px, not % height. */
  protected readonly chartTrackHeightPx = 40;

  private readonly chartRef = viewChild<ElementRef<HTMLElement>>('chart');

  /** Stable state: pointer drag in progress on the histogram track. */
  // @see docs/specs/component/map/map-filter-toolbar.md
  private readonly dragStartRatio = signal<number | null>(null);
  private readonly dragCurrentRatio = signal<number | null>(null);

  ngOnInit(): void {
    this.catalog.ensureLoaded();
  }

  private readonly scopedEntries = computed(() => {
    this.catalog.entries();
    this.viewService.selectedProjectIds();

    const projectIds = this.viewService.selectedProjectIds();
    const entries = this.catalog.entries();

    if (projectIds.size === 0) {
      return entries;
    }

    return entries.filter((entry) => entry.projectIds.some((id) => projectIds.has(id)));
  });

  readonly histogram = computed(() => buildTimespaceHistogram(this.scopedEntries()));

  readonly domainMinDate = computed((): Date | null => {
    const hist = this.histogram();
    if (!hist) {
      return null;
    }
    return new Date(hist.domainStartMs);
  });

  readonly domainMaxDate = computed((): Date | null => {
    const hist = this.histogram();
    if (!hist) {
      return null;
    }
    return new Date(hist.domainEndMs);
  });

  readonly rangeDropdownValue = computed((): CalendarRangeValue | null => {
    const range = this.effectiveRange();
    if (!range?.from && !range?.to) return null;
    return {
      from: range?.from ? { date: toIsoDateValue(range.from), time: null } : null,
      to: range?.to ? { date: toIsoDateValue(range.to), time: null } : null,
    };
  });

  readonly matchedItemCount = computed(() => {
    const entries = this.scopedEntries();
    const range = this.effectiveRange();
    if (!isTimeRangeActive(range)) {
      return entries.length;
    }
    return entries.filter((entry) => matchesTimeRange(entry, range)).length;
  });

  readonly itemCountLabel = computed(() => {
    const count = this.matchedItemCount();
    if (count === 1) {
      return this.t('map.filter.timespace.count.single', '1 item');
    }
    return this.t('map.filter.timespace.count.multi', '{count} items').replace(
      '{count}',
      String(count),
    );
  });

  readonly effectiveRange = computed((): TimeRange | null => {
    const hist = this.histogram();
    if (!hist) {
      return this.viewService.timeRange();
    }

    const dragStart = this.dragStartRatio();
    const dragCurrent = this.dragCurrentRatio();
    if (dragStart != null && dragCurrent != null) {
      return dragRange(hist.domainStartMs, hist.domainEndMs, dragStart, dragCurrent);
    }

    return this.viewService.timeRange();
  });

  onRangeChange(value: CalendarRangeValue | null): void {
    const from = value?.from?.date ? parseIsoDateValue(value.from.date) : null;
    const to = value?.to?.date ? parseIsoDateValue(value.to.date) : null;
    this.commitRange({ from, to });
  }

  onReset(): void {
    this.clearDrag();
    this.viewService.setTimeRange(null);
  }

  readonly hasActiveFilter = this.viewService.hasTimeRange;

  readonly selectionOverlay = computed(() => {
    const hist = this.histogram();
    if (!hist) return null;
    return selectionOverlayPercents(
      this.effectiveRange(),
      hist.domainStartMs,
      hist.domainEndMs,
    );
  });

  /** Pointer drag on histogram — primary gold emphasis for the in-progress range. */
  readonly isDragging = computed(() => this.dragStartRatio() != null);

  protected barHeightPx(bin: TimespaceBin): number {
    if (bin.count <= 0) {
      return 0;
    }
    return Math.max(2, Math.round((bin.heightPct / 100) * this.chartTrackHeightPx));
  }

  onChartPointerDown(event: PointerEvent): void {
    const chart = this.chartRef()?.nativeElement;
    if (!chart || event.button !== 0) return;
    chart.setPointerCapture(event.pointerId);
    const ratio = this.pointerRatio(event.clientX);
    this.dragStartRatio.set(ratio);
    this.dragCurrentRatio.set(ratio);
    this.applyDragRange(ratio);
  }

  onChartPointerMove(event: PointerEvent): void {
    if (this.dragStartRatio() == null) return;
    const ratio = this.pointerRatio(event.clientX);
    this.dragCurrentRatio.set(ratio);
    this.applyDragRange(ratio);
  }

  onChartPointerUp(event: PointerEvent): void {
    const chart = this.chartRef()?.nativeElement;
    const hist = this.histogram();
    const start = this.dragStartRatio();
    const end = this.dragCurrentRatio();
    if (!chart || !hist || start == null || end == null) {
      this.clearDrag();
      return;
    }

    chart.releasePointerCapture(event.pointerId);
    const moved = Math.abs(end - start) > 0.008;
    const range = moved
      ? dragRange(hist.domainStartMs, hist.domainEndMs, start, end)
      : clickBandRange(hist.domainStartMs, hist.domainEndMs, start);
    this.commitRange(range);
    this.clearDrag();
  }

  onChartPointerCancel(): void {
    this.clearDrag();
  }

  private pointerRatio(clientX: number): number {
    const chart = this.chartRef()?.nativeElement;
    if (!chart) {
      return 0;
    }
    return ratioFromClientXInInsetBox(clientX, chart, '--timespace-selection-inset');
  }

  private applyDragRange(endRatio: number): void {
    const hist = this.histogram();
    const start = this.dragStartRatio();
    if (!hist || start == null) {
      return;
    }
    const range = dragRange(hist.domainStartMs, hist.domainEndMs, start, endRatio);
    this.commitRange(range);
  }

  private clearDrag(): void {
    this.dragStartRatio.set(null);
    this.dragCurrentRatio.set(null);
  }

  private commitRange(range: { from: Date | null; to: Date | null }): void {
    if (range.from && range.to && range.from.getTime() > range.to.getTime()) {
      this.viewService.setTimeRange({ from: range.to, to: range.from });
      return;
    }
    this.viewService.setTimeRange(range);
  }

}
