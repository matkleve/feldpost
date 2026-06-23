import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import {
  applyRangeAnchorDayClick,
  buildCalendarDays,
  buildRangeCalendarDays,
  isCalendarDayDisabled,
  shiftCalendarMonth,
  todayIsoUtc,
} from './calendar-picker.helpers';
import type {
  CalendarDay,
  CalendarDropdownValue,
  CalendarRangeValue,
  RangeAnchorTarget,
  TimeMode,
} from './calendar-dropdown.types';

@Component({
  selector: 'app-calendar-picker-panel',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS],
  templateUrl: './calendar-picker-panel.component.html',
  styleUrl: './calendar-picker-panel.component.scss',
})
export class CalendarPickerPanelComponent implements OnInit {
  protected readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // ── Shared inputs ────────────────────────────────────────────────────────
  readonly pickMode = input<'single' | 'range'>('single');
  readonly anchorTarget = input<RangeAnchorTarget>('from');
  readonly timeMode = input<TimeMode>('dateOnly');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly disabledDates = input<ReadonlySet<string> | null>(null);
  readonly nullable = input(true);

  // ── Single mode ───────────────────────────────────────────────────────────
  readonly draft = input<CalendarDropdownValue | null>(null);
  readonly draftChange = output<CalendarDropdownValue | null>();

  // ── Range mode ────────────────────────────────────────────────────────────
  readonly rangeDraft = input<CalendarRangeValue | null>(null);
  readonly rangeDraftChange = output<CalendarRangeValue | null>();
  /** ISO date the visible month should track on open / anchor change. */
  readonly viewAnchorDate = input('');

  // ── Shared outputs ────────────────────────────────────────────────────────
  readonly done = output<void>();
  readonly clear = output<void>();
  readonly cancel = output<void>();

  // ── View state ────────────────────────────────────────────────────────────
  /** Left month in range dual-grid; sole month in single mode. */
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  /** Currently hovered enabled day — drives hover-preview range wash. */
  readonly hoveredDate = signal('');

  /** Last focus ISO we synced the visible month to — prevents nav snap-back. */
  private viewSyncedToDate = '';

  readonly weekdays = computed(() => [
    this.t('workspace.capturedDate.weekday.mon', 'Mo'),
    this.t('workspace.capturedDate.weekday.tue', 'Tu'),
    this.t('workspace.capturedDate.weekday.wed', 'We'),
    this.t('workspace.capturedDate.weekday.thu', 'Th'),
    this.t('workspace.capturedDate.weekday.fri', 'Fr'),
    this.t('workspace.capturedDate.weekday.sat', 'Sa'),
    this.t('workspace.capturedDate.weekday.sun', 'Su'),
  ]);

  readonly rightView = computed(() =>
    shiftCalendarMonth(this.viewYear(), this.viewMonth(), 1),
  );

  readonly monthLabel = computed(() => this.formatMonthLabel(this.viewYear(), this.viewMonth()));

  readonly rightMonthLabel = computed(() => {
    const right = this.rightView();
    return this.formatMonthLabel(right.year, right.month);
  });

  readonly selectedDate = computed(() => this.draft()?.date ?? '');

  /** Opposite bound for hover-preview wash while replacing the active field anchor. */
  private readonly previewAnchorDate = computed(() => {
    const anchor = this.anchorTarget();
    const range = this.rangeDraft();
    if (anchor === 'from') return range?.to?.date ?? '';
    return range?.from?.date ?? '';
  });

  private readonly rangeFromDate = computed(() => this.rangeDraft()?.from?.date ?? '');
  private readonly rangeToDate = computed(() => this.rangeDraft()?.to?.date ?? '');

  private buildRangeDays(year: number, month: number): CalendarDay[] {
    return buildRangeCalendarDays(
      year,
      month,
      this.rangeFromDate(),
      this.rangeToDate(),
      this.previewAnchorDate(),
      this.hoveredDate(),
      this.minDate(),
      this.maxDate(),
      this.disabledDates(),
    );
  }

  readonly calendarDays = computed((): CalendarDay[] => {
    if (this.pickMode() === 'range') {
      return this.buildRangeDays(this.viewYear(), this.viewMonth());
    }
    return buildCalendarDays(
      this.viewYear(),
      this.viewMonth(),
      this.selectedDate(),
      this.minDate(),
      this.maxDate(),
      this.disabledDates(),
    );
  });

  readonly rightCalendarDays = computed((): CalendarDay[] => {
    const right = this.rightView();
    return this.buildRangeDays(right.year, right.month);
  });

  readonly canDone = computed(() => {
    if (this.pickMode() === 'range') {
      const range = this.rangeDraft();
      return !!(range?.from?.date && range?.to?.date);
    }
    const draft = this.draft();
    if (!draft?.date) return this.nullable();
    return true;
  });

  constructor() {
    effect(() => {
      const anchorDate = this.viewAnchorDate();
      if (anchorDate) {
        this.syncVisibleMonthToDate(anchorDate);
        return;
      }
      this.syncViewToFocus();
    });
  }

  ngOnInit(): void {
    const anchorDate = this.viewAnchorDate();
    if (anchorDate) {
      this.syncVisibleMonthToDate(anchorDate);
      return;
    }
    this.syncViewToFocus();
  }

  // ── Day interaction ───────────────────────────────────────────────────────

  selectDay(day: CalendarDay): void {
    if (day.isDisabled) return;

    if (this.pickMode() === 'range') {
      this.selectDayRange(day);
      return;
    }

    this.emitDraft({ date: day.date, time: null });
    if (!day.isCurrentMonth) this.syncVisibleMonthToDate(day.date);
  }

  onDayMouseEnter(day: CalendarDay): void {
    if (this.pickMode() === 'range' && !day.isDisabled) {
      this.hoveredDate.set(day.date);
    }
  }

  onDayMouseLeave(): void {
    this.hoveredDate.set('');
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  prevMonth(): void {
    const shifted = shiftCalendarMonth(this.viewYear(), this.viewMonth(), -1);
    this.viewYear.set(shifted.year);
    this.viewMonth.set(shifted.month);
    this.viewSyncedToDate = '';
  }

  nextMonth(): void {
    const shifted = shiftCalendarMonth(this.viewYear(), this.viewMonth(), 1);
    this.viewYear.set(shifted.year);
    this.viewMonth.set(shifted.month);
    this.viewSyncedToDate = '';
  }

  setToday(): void {
    const iso = todayIsoUtc();
    if (isCalendarDayDisabled(iso, this.minDate(), this.maxDate(), this.disabledDates())) {
      return;
    }
    this.syncVisibleMonthToDate(iso);
    if (this.pickMode() === 'range') {
      this.selectDayRange({
        date: iso,
        day: 0,
        isCurrentMonth: true,
        isToday: true,
        isSelected: false,
        isDisabled: false,
        isRangeStart: false,
        isRangeEnd: false,
        isInRange: false,
        isPreviewInRange: false,
      });
      return;
    }
    this.emitDraft({ date: iso, time: null });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  onDoneClick(): void {
    if (!this.canDone()) return;
    this.done.emit();
  }

  onClearClick(): void {
    this.clear.emit();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private selectDayRange(day: CalendarDay): void {
    const anchor = this.anchorTarget();
    const current = this.rangeDraft();
    const next = applyRangeAnchorDayClick(
      anchor,
      current?.from?.date ?? null,
      current?.to?.date ?? null,
      day.date,
    );

    const newDraft: CalendarRangeValue = {
      from: next.from ? { date: next.from, time: current?.from?.time ?? null } : null,
      to: next.to ? { date: next.to, time: current?.to?.time ?? null } : null,
    };
    this.rangeDraftChange.emit(newDraft);

    if (!day.isCurrentMonth) this.syncVisibleMonthToDate(day.date);
  }

  private syncViewToFocus(): void {
    if (this.pickMode() === 'range') {
      const focus = this.resolveFocusDate(this.anchorTarget(), this.rangeDraft());
      if (focus) {
        this.syncVisibleMonthToDate(focus);
      } else {
        this.viewSyncedToDate = '';
      }
      return;
    }

    const date = this.draft()?.date ?? '';
    if (date) {
      this.syncVisibleMonthToDate(date);
    } else {
      this.viewSyncedToDate = '';
    }
  }

  private emitDraft(next: CalendarDropdownValue | null): void {
    this.draftChange.emit(next);
  }

  private resolveFocusDate(
    anchor: RangeAnchorTarget,
    range: CalendarRangeValue | null,
  ): string {
    const from = range?.from?.date ?? '';
    const to = range?.to?.date ?? '';
    return anchor === 'to' ? to || from : from || to;
  }

  private formatMonthLabel(year: number, month: number): string {
    const date = new Date(year, month, 1);
    return date.toLocaleDateString(this.i18nService.locale(), {
      month: 'short',
      year: 'numeric',
    });
  }

  /** Jump the left grid month when the focused draft date changes — not on prev/next nav. */
  private syncVisibleMonthToDate(isoDate: string): void {
    if (!isoDate || isoDate === this.viewSyncedToDate) return;
    this.viewSyncedToDate = isoDate;
    const parts = isoDate.split('-');
    this.viewYear.set(parseInt(parts[0], 10));
    this.viewMonth.set(parseInt(parts[1], 10) - 1);
  }
}
