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
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { CalendarPickerPanelComponent } from './calendar-picker-panel.component';
import { normalizeRangeValue } from './calendar-picker.helpers';
import type {
  CalendarDropdownValue,
  CalendarRangeValue,
  RangeAnchorTarget,
  TimeMode,
} from './calendar-dropdown.types';

@Component({
  selector: 'app-calendar-dropdown',
  standalone: true,
  imports: [DropdownShellComponent, CalendarPickerPanelComponent, ...HLM_BUTTON_IMPORTS],
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

  readonly placeholder = computed(() => this.i18nService.dateFieldPlaceholder());

  readonly panelViewAnchorDate = computed(() => {
    if (this.mode() !== 'range') {
      return this.draft()?.date ?? '';
    }
    const range = this.rangeDraft() ?? this.rangeValue();
    const target = this.anchorTarget();
    const from = range?.from?.date ?? '';
    const to = range?.to?.date ?? '';
    if (target === 'pick') return from || to;
    if (target === 'to') return to || from;
    if (target === 'from') return from || to;
    return from || to;
  });

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
    this.closePopover(false);
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
        this.anchorTarget.set(field);
        return;
      }
      this.closePopover(false);
      return;
    }

    this.anchorTarget.set(field);
    this.rangeDraft.set(this.cloneRangeValue(this.rangeValue()));
    this.popoverOpen.set(true);
  }

  /** Split layout: center icon opens two-click range pick in the panel. */
  toggleRangePickPopover(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      if (this.anchorTarget() !== 'pick') {
        this.anchorTarget.set('pick');
        return;
      }
      this.closePopover(false);
      return;
    }

    this.anchorTarget.set('pick');
    this.rangeDraft.set(this.cloneRangeValue(this.rangeValue()));
    this.popoverOpen.set(true);
  }

  /** Split layout: focus highlights one field for typing; does not open the panel. */
  onRangeFieldFocus(field: 'from' | 'to'): void {
    this.anchorTarget.set(field);
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

  // ── Private ───────────────────────────────────────────────────────────────

  private closePopover(_committed: boolean): void {
    this.popoverOpen.set(false);
    this.draft.set(null);
    this.rangeDraft.set(null);
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
}
