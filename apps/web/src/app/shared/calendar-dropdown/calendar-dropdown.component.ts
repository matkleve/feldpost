import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { parseIsoDateValue, toIsoDateValue } from '../../core/i18n/date-field.helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../dropdown-trigger/shell/dropdown-shell.component';
import { TimeFieldControlComponent } from '../time-field-control/time-field-control.component';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { CalendarPickerPanelComponent } from './calendar-picker-panel.component';
import { normalizeRangeValue, resolveRangeViewAnchorDate } from './calendar-picker.helpers';
import type {
  CalendarDropdownValue,
  CalendarRangeValue,
  RangeAnchorTarget,
  TimeMode,
} from './calendar-dropdown.types';

@Component({
  selector: 'app-calendar-dropdown',
  standalone: true,
  imports: [DropdownShellComponent, CalendarPickerPanelComponent, TimeFieldControlComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './calendar-dropdown.component.html',
  styleUrl: './calendar-dropdown.component.scss',
})
export class CalendarDropdownComponent {
  protected readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // ── Mode ─────────────────────────────────────────────────────────────────
  readonly mode = input<'single' | 'range'>('single');
  /** `toolbar` = per-field icon; `split` = input-only fields + center range-pick icon (timespace). */
  readonly layout = input<'default' | 'toolbar' | 'split'>('default');

  // ── Single mode API ───────────────────────────────────────────────────────
  readonly label = input('');
  readonly ariaLabel = input('');
  readonly value = input<CalendarDropdownValue | null>(null);
  readonly timeMode = input<TimeMode>('dateOnly');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly disabledDates = input<ReadonlySet<string> | null>(null);
  readonly nullable = input(true);

  readonly valueChange = output<CalendarDropdownValue | null>();

  // ── Range mode API ────────────────────────────────────────────────────────
  readonly fromLabel = input('');
  readonly toLabel = input('');
  readonly rangeValue = input<CalendarRangeValue | null>(null);
  readonly rangeChange = output<CalendarRangeValue | null>();

  // ── Popover state (shared) ────────────────────────────────────────────────
  readonly popoverOpen = signal(false);

  // ── Single mode draft ─────────────────────────────────────────────────────
  readonly draft = signal<CalendarDropdownValue | null>(null);

  // ── Range mode draft + FSM ────────────────────────────────────────────────
  readonly rangeDraft = signal<CalendarRangeValue | null>(null);
  readonly anchorTarget = signal<RangeAnchorTarget>('from');
  /** Stable month anchor when popover opens — does not follow live draft (prevents grid jump). */
  readonly viewAnchorAtOpen = signal('');

  readonly showTimeFields = computed(() => this.timeMode() !== 'dateOnly');

  // ── Anchor elements ───────────────────────────────────────────────────────
  private readonly controlRef = viewChild<ElementRef<HTMLElement>>('control');
  private readonly fromControlRef = viewChild<ElementRef<HTMLElement>>('fromControl');
  private readonly toControlRef = viewChild<ElementRef<HTMLElement>>('toControl');
  private readonly pickControlRef = viewChild<ElementRef<HTMLElement>>('pickControl');

  readonly anchorEl = computed(() => {
    if (this.mode() === 'range') {
      const anchor = this.anchorTarget();
      if (anchor === 'pick') {
        return this.pickControlRef()?.nativeElement ?? null;
      }
      if (anchor === 'to') {
        return this.toControlRef()?.nativeElement ?? null;
      }
      return this.fromControlRef()?.nativeElement ?? null;
    }
    return this.controlRef()?.nativeElement ?? null;
  });

  // ── Display text computeds ────────────────────────────────────────────────
  readonly shellDisplayText = computed(() => {
    const dateIso = this.value()?.date;
    if (!dateIso) return '';
    const parsed = parseIsoDateValue(dateIso);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly fromShellText = computed(() => {
    const source = this.popoverOpen() ? this.rangeDraft() : this.rangeValue();
    const d = source?.from?.date;
    if (!d) return '';
    const parsed = parseIsoDateValue(d);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly toShellText = computed(() => {
    const source = this.popoverOpen() ? this.rangeDraft() : this.rangeValue();
    const d = source?.to?.date;
    if (!d) return '';
    const parsed = parseIsoDateValue(d);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly fromTimeValue = computed(() => {
    const source = this.popoverOpen() ? this.rangeDraft() : this.rangeValue();
    return source?.from?.time ?? null;
  });

  readonly toTimeValue = computed(() => {
    const source = this.popoverOpen() ? this.rangeDraft() : this.rangeValue();
    return source?.to?.time ?? null;
  });

  readonly placeholder = computed(() => this.i18nService.dateFieldPlaceholder());

  readonly panelViewAnchorDate = computed(() => this.viewAnchorAtOpen());

  // ── Single mode actions ───────────────────────────────────────────────────

  openIfClosed(): void {
    if (!this.popoverOpen()) {
      this.draft.set(this.cloneValue(this.value()));
      this.popoverOpen.set(true);
    }
  }

  togglePopover(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      this.closePopover(false);
      return;
    }

    this.draft.set(this.cloneValue(this.value()));
    this.popoverOpen.set(true);
  }

  onPopoverCloseRequested(): void {
    this.dismissRangePopover();
  }

  onDraftChange(next: CalendarDropdownValue | null): void {
    this.draft.set(next);
  }

  onPanelDone(): void {
    const next = this.normalizeDraft(this.draft());
    if (!this.isDraftValid(next)) return;
    this.valueChange.emit(next);
    this.closePopover(true);
  }

  onPanelClear(): void {
    this.valueChange.emit(null);
    this.closePopover(true);
  }

  onShellTextCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = this.i18nService.parseDateFieldValue(raw);
    const date = parsed ? toIsoDateValue(parsed) : null;
    const time = this.timeMode() === 'dateOnly' ? null : (this.value()?.time ?? null);

    if (!date && !time) {
      this.valueChange.emit(null);
      return;
    }
    this.valueChange.emit({ date, time });
  }

  // ── Range mode actions ────────────────────────────────────────────────────

  toggleRangePopover(event: MouseEvent, field: 'from' | 'to'): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      if (this.anchorTarget() !== field) {
        this.reanchorRangeField(field);
        return;
      }
      this.dismissRangePopover();
      return;
    }

    this.openRangeFieldPopover(field);
  }

  /** Split layout: center icon opens two-click range pick in the panel. */
  toggleRangePickPopover(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      if (this.anchorTarget() !== 'pick') {
        this.openRangePickPopover();
        return;
      }
      this.closePopover(false);
      return;
    }

    this.openRangePickPopover();
  }

  /** Split layout: focus opens single-endpoint calendar for that field. */
  onRangeFieldFocus(field: 'from' | 'to'): void {
    if (this.popoverOpen()) {
      if (this.anchorTarget() !== field) {
        this.reanchorRangeField(field);
      }
      return;
    }
    this.openRangeFieldPopover(field);
  }

  onRangeDraftChange(next: CalendarRangeValue | null): void {
    this.rangeDraft.set(next);
  }

  onRangePanelDone(): void {
    const draft = normalizeRangeValue(this.rangeDraft());
    if (!draft?.from?.date || !draft?.to?.date) return;
    this.rangeChange.emit(draft);
    this.closePopover(true);
  }

  onRangePanelClear(): void {
    this.rangeChange.emit(null);
    this.closePopover(true);
  }

  onFromShellTextCommit(event: Event): void {
    this.applyRangeShellHalf('from', (event.target as HTMLInputElement).value);
  }

  onToShellTextCommit(event: Event): void {
    this.applyRangeShellHalf('to', (event.target as HTMLInputElement).value);
  }

  onFromTimeChange(time: string | null): void {
    this.applyRangeTimeHalf('from', time);
  }

  onToTimeChange(time: string | null): void {
    this.applyRangeTimeHalf('to', time);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private closePopover(_committed: boolean): void {
    this.popoverOpen.set(false);
    this.draft.set(null);
    this.rangeDraft.set(null);
    this.viewAnchorAtOpen.set('');
  }

  /** Split field anchor: commit draft when the portaled panel dismisses (not on each day click). */
  private dismissRangePopover(): void {
    if (this.mode() === 'range') {
      this.commitSplitFieldAnchorDraft();
    }
    this.closePopover(false);
  }

  private commitSplitFieldAnchorDraft(): void {
    if (this.layout() !== 'split' || !this.popoverOpen()) {
      return;
    }
    const anchor = this.anchorTarget();
    if (anchor !== 'from' && anchor !== 'to') {
      return;
    }
    const draft = normalizeRangeValue(this.rangeDraft());
    const hasEndpoint =
      anchor === 'from' ? !!draft?.from?.date : anchor === 'to' ? !!draft?.to?.date : false;
    if (!hasEndpoint) {
      return;
    }
    this.rangeChange.emit(draft);
  }

  private openRangeFieldPopover(field: 'from' | 'to'): void {
    const range = this.rangeValue();
    this.anchorTarget.set(field);
    this.viewAnchorAtOpen.set(resolveRangeViewAnchorDate(field, range));
    this.rangeDraft.set(this.cloneRangeValue(range));
    this.popoverOpen.set(true);
  }

  private openRangePickPopover(): void {
    const range = this.rangeValue();
    this.anchorTarget.set('pick');
    this.viewAnchorAtOpen.set(resolveRangeViewAnchorDate('pick', range));
    this.rangeDraft.set(this.cloneRangeValue(range));
    this.popoverOpen.set(true);
  }

  private reanchorRangeField(field: 'from' | 'to'): void {
    const range = this.rangeDraft() ?? this.rangeValue();
    this.anchorTarget.set(field);
    this.viewAnchorAtOpen.set(resolveRangeViewAnchorDate(field, range));
  }

  private cloneValue(value: CalendarDropdownValue | null): CalendarDropdownValue | null {
    if (!value) return null;
    return { date: value.date, time: value.time };
  }

  private cloneRangeValue(value: CalendarRangeValue | null): CalendarRangeValue | null {
    if (!value) return null;
    return {
      from: value.from ? { date: value.from.date, time: value.from.time } : null,
      to: value.to ? { date: value.to.date, time: value.to.time } : null,
    };
  }

  private normalizeDraft(draft: CalendarDropdownValue | null): CalendarDropdownValue | null {
    if (!draft?.date && !draft?.time) return null;
    if (this.timeMode() === 'dateOnly') return draft?.date ? { date: draft.date, time: null } : null;
    return draft;
  }

  private isDraftValid(draft: CalendarDropdownValue | null): boolean {
    if (!draft?.date) return this.nullable();
    return true;
  }

  /**
   * Shell typing: popover open → draft half only (spec: blur does not close).
   * Popover closed → commit immediately to parent (timespace inline edit).
   */
  private applyRangeShellHalf(field: 'from' | 'to', raw: string): void {
    const parsed = this.i18nService.parseDateFieldValue(raw);
    const date = parsed ? toIsoDateValue(parsed) : null;
    const base = this.popoverOpen()
      ? (this.rangeDraft() ?? this.cloneRangeValue(this.rangeValue()))
      : this.cloneRangeValue(this.rangeValue());

    let fromIso = field === 'from' ? date : (base?.from?.date ?? null);
    let toIso = field === 'to' ? date : (base?.to?.date ?? null);

    const normalized = normalizeRangeValue({
      from: fromIso ? { date: fromIso, time: base?.from?.time ?? null } : null,
      to: toIso ? { date: toIso, time: base?.to?.time ?? null } : null,
    });

    if (this.popoverOpen()) {
      this.anchorTarget.set(field);
      this.rangeDraft.set(normalized);
      return;
    }

    if (!normalized?.from?.date && !normalized?.to?.date) {
      this.rangeChange.emit(null);
      return;
    }
    this.rangeChange.emit(normalized);
  }

  private applyRangeTimeHalf(field: 'from' | 'to', time: string | null): void {
    const base = this.popoverOpen()
      ? (this.rangeDraft() ?? this.cloneRangeValue(this.rangeValue()))
      : this.cloneRangeValue(this.rangeValue());

    const normalized = normalizeRangeValue({
      from:
        field === 'from'
          ? { date: base?.from?.date ?? null, time }
          : base?.from
            ? { date: base.from.date, time: base.from.time }
            : null,
      to:
        field === 'to'
          ? { date: base?.to?.date ?? null, time }
          : base?.to
            ? { date: base.to.date, time: base.to.time }
            : null,
    });

    if (this.popoverOpen()) {
      this.rangeDraft.set(normalized);
      return;
    }

    this.rangeChange.emit(normalized);
  }
}
