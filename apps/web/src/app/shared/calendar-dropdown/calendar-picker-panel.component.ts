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
import { buildCalendarDays, isCalendarDayDisabled, todayIsoUtc } from './calendar-picker.helpers';
import type { CalendarDay, CalendarDropdownValue, TimeMode } from './calendar-dropdown.types';

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

  readonly timeMode = input<TimeMode>('dateOnly');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly disabledDates = input<ReadonlySet<string> | null>(null);
  readonly nullable = input(true);
  readonly draft = input<CalendarDropdownValue | null>(null);

  readonly draftChange = output<CalendarDropdownValue | null>();
  readonly done = output<void>();
  readonly clear = output<void>();
  readonly cancel = output<void>();

  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());

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
    return date.toLocaleDateString(this.i18nService.locale(), { month: 'short', year: 'numeric' });
  });

  readonly selectedDate = computed(() => this.draft()?.date ?? '');

  readonly calendarDays = computed((): CalendarDay[] =>
    buildCalendarDays(
      this.viewYear(),
      this.viewMonth(),
      this.selectedDate(),
      this.minDate(),
      this.maxDate(),
      this.disabledDates(),
    ),
  );

  readonly canDone = computed(() => {
    const draft = this.draft();
    if (!draft?.date) {
      return this.nullable();
    }
    return true;
  });

  constructor() {
    // Sync the visible month when the committed draft date changes.
    effect(() => {
      const date = this.draft()?.date ?? '';
      if (date) {
        this.syncVisibleMonthToDate(date);
      } else {
        this.viewSyncedToDate = '';
      }
    });
  }

  selectDay(day: CalendarDay): void {
    if (day.isDisabled) {
      return;
    }
    this.emitDraft({
      date: day.date,
      time: this.timeMode() === 'dateOnly' ? null : (this.draft()?.time ?? null),
    });

    if (!day.isCurrentMonth) {
      this.syncVisibleMonthToDate(day.date);
    }
  }

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
    this.emitDraft({
      date: iso,
      time: this.timeMode() === 'dateOnly' ? null : (this.draft()?.time ?? null),
    });
  }

  onDoneClick(): void {
    if (!this.canDone()) {
      return;
    }
    this.done.emit();
  }

  onClearClick(): void {
    this.clear.emit();
  }

  private emitDraft(next: CalendarDropdownValue | null): void {
    if (this.timeMode() === 'dateOnly' && next) {
      this.draftChange.emit({ date: next.date, time: null });
      return;
    }
    this.draftChange.emit(next);
  }

  /** Jump the grid month only when the committed draft date changes — not on prev/next nav. */
  private syncVisibleMonthToDate(isoDate: string): void {
    if (!isoDate || isoDate === this.viewSyncedToDate) {
      return;
    }

    this.viewSyncedToDate = isoDate;
    const parts = isoDate.split('-');
    this.viewYear.set(parseInt(parts[0], 10));
    this.viewMonth.set(parseInt(parts[1], 10) - 1);
  }
}
