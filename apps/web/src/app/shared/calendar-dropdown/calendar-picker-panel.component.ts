import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import {
  buildCalendarDays,
  buildRangeCalendarDays,
  isCalendarDayDisabled,
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
export class CalendarPickerPanelComponent {
  protected readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // ── Shared inputs ────────────────────────────────────────────────────────
  readonly pickMode = input<'single' | 'range'>('single');
  readonly anchorTarget = input<RangeAnchorTarget>('pick');
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

  // ── Shared outputs ────────────────────────────────────────────────────────
  readonly done = output<void>();
  readonly clear = output<void>();
  readonly cancel = output<void>();

  // ── View state ────────────────────────────────────────────────────────────
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  /** Currently hovered enabled day — drives hover-preview range wash. */
  readonly hoveredDate = signal('');

  /** Last draft ISO date we synced the visible month to — prevents nav snap-back. */
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

  readonly monthLabel = computed(() => {
    const date = new Date(this.viewYear(), this.viewMonth(), 1);
    return date.toLocaleDateString(this.i18nService.locale(), {
      month: 'short',
      year: 'numeric',
    });
  });

  readonly selectedDate = computed(() => this.draft()?.date ?? '');

  /**
   * Fixed anchor date for hover-preview: the bound that is NOT being replaced.
   * - anchor-from: user replacing "from" → opposite anchor is "to"
   * - anchor-to:   user replacing "to"   → opposite anchor is "from"
   * - pick:        first click fixed "from"; second click will set "to"
   */
  private readonly previewAnchorDate = computed(() => {
    const anchor = this.anchorTarget();
    const range = this.rangeDraft();
    if (anchor === 'from') return range?.to?.date ?? '';
    if (anchor === 'to') return range?.from?.date ?? '';
    // 'pick': anchor to already-set "from" (first of two clicks)
    return range?.from?.date ?? '';
  });

  readonly calendarDays = computed((): CalendarDay[] => {
    if (this.pickMode() === 'range') {
      const range = this.rangeDraft();
      return buildRangeCalendarDays(
        this.viewYear(),
        this.viewMonth(),
        range?.from?.date ?? '',
        range?.to?.date ?? '',
        this.previewAnchorDate(),
        this.hoveredDate(),
        this.minDate(),
        this.maxDate(),
        this.disabledDates(),
      );
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
    // Sync visible month when the committed draft date changes (prevents nav snap-back).
    effect(() => {
      if (this.pickMode() === 'range') {
        const from = this.rangeDraft()?.from?.date ?? '';
        if (from) this.syncVisibleMonthToDate(from);
        else this.viewSyncedToDate = '';
      } else {
        const date = this.draft()?.date ?? '';
        if (date) this.syncVisibleMonthToDate(date);
        else this.viewSyncedToDate = '';
      }
    });
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
    if (this.viewMonth() === 0) {
      this.viewYear.update((y) => y - 1);
      this.viewMonth.set(11);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewYear.update((y) => y + 1);
      this.viewMonth.set(0);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
  }

  setToday(): void {
    const iso = todayIsoUtc();
    if (isCalendarDayDisabled(iso, this.minDate(), this.maxDate(), this.disabledDates())) {
      return;
    }
    this.syncVisibleMonthToDate(iso);
    if (this.pickMode() === 'range') {
      this.selectDayRange({ date: iso, day: 0, isCurrentMonth: true, isToday: true, isSelected: false, isDisabled: false, isRangeStart: false, isRangeEnd: false, isInRange: false, isPreviewInRange: false });
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
    let from = current?.from?.date ?? null;
    let to = current?.to?.date ?? null;

    if (anchor === 'from') {
      from = day.date;
    } else if (anchor === 'to') {
      to = day.date;
    } else {
      // Two-click 'pick' flow: first click = from, second click = to
      if (!from) {
        from = day.date;
        to = null;
      } else {
        to = day.date;
      }
    }

    // Normalize order: earlier date is always "from"
    if (from && to && from > to) {
      [from, to] = [to, from];
    }

    const newDraft: CalendarRangeValue = {
      from: from ? { date: from, time: current?.from?.time ?? null } : null,
      to: to ? { date: to, time: current?.to?.time ?? null } : null,
    };
    this.rangeDraftChange.emit(newDraft);

    if (!day.isCurrentMonth) this.syncVisibleMonthToDate(day.date);
  }

  private emitDraft(next: CalendarDropdownValue | null): void {
    this.draftChange.emit(next);
  }

  /** Jump the grid month only when the committed draft date changes — not on prev/next nav. */
  private syncVisibleMonthToDate(isoDate: string): void {
    if (!isoDate || isoDate === this.viewSyncedToDate) return;
    this.viewSyncedToDate = isoDate;
    const parts = isoDate.split('-');
    this.viewYear.set(parseInt(parts[0], 10));
    this.viewMonth.set(parseInt(parts[1], 10) - 1);
  }
}
