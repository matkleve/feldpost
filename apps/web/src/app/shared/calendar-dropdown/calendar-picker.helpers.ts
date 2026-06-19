import { parseIsoDateValue, toIsoDateValue } from '../../core/i18n/date-field.helpers';
import type { CalendarDay } from './calendar-dropdown.types';

export function utcDayMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isCalendarDayDisabled(
  isoDate: string,
  minDate: Date | null,
  maxDate: Date | null,
  disabledDates: ReadonlySet<string> | null,
): boolean {
  if (disabledDates?.has(isoDate)) {
    return true;
  }

  const dayMs = parseIsoDateValue(isoDate)?.getTime();
  if (dayMs == null) {
    return true;
  }

  if (minDate != null && dayMs < utcDayMs(minDate)) {
    return true;
  }

  if (maxDate != null && dayMs > utcDayMs(maxDate)) {
    return true;
  }

  return false;
}

export function todayIsoUtc(): string {
  const now = new Date();
  return toIsoDateValue(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
  );
}

export function buildCalendarDays(
  year: number,
  month: number,
  selected: string,
  minDate: Date | null,
  maxDate: Date | null,
  disabledDates: ReadonlySet<string> | null,
): CalendarDay[] {
  const today = todayIsoUtc();

  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) {
    startDow = 6;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(makeDay(dateStr, d, false, today, selected, minDate, maxDate, disabledDates));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(makeDay(dateStr, d, true, today, selected, minDate, maxDate, disabledDates));
  }

  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push(makeDay(dateStr, d, false, today, selected, minDate, maxDate, disabledDates));
  }

  return days;
}

function makeDay(
  dateStr: string,
  day: number,
  isCurrentMonth: boolean,
  today: string,
  selected: string,
  minDate: Date | null,
  maxDate: Date | null,
  disabledDates: ReadonlySet<string> | null,
): CalendarDay {
  return {
    date: dateStr,
    day,
    isCurrentMonth,
    isToday: dateStr === today,
    isSelected: dateStr === selected,
    isDisabled: isCalendarDayDisabled(dateStr, minDate, maxDate, disabledDates),
  };
}
