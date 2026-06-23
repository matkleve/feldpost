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

/** Calendar month index 0–11 with year rollover. */
export function shiftCalendarMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Field-anchored day click — replaces the active bound only; normalizes order when both exist.
 * @see docs/specs/component/filters/calendar-dropdown.range-mode.supplement.md
 */
export function applyRangeAnchorDayClick(
  anchor: 'from' | 'to',
  currentFrom: string | null,
  currentTo: string | null,
  clickedIso: string,
): { from: string | null; to: string | null } {
  let from = currentFrom;
  let to = currentTo;
  if (anchor === 'from') {
    from = clickedIso;
  } else {
    to = clickedIso;
  }
  if (from && to && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

/**
 * Two-click range pick — first click sets start, second sets end; third restarts.
 * @see docs/specs/component/filters/calendar-dropdown.range-mode.supplement.md § Split layout
 */
export function applyRangePickDayClick(
  currentFrom: string | null,
  currentTo: string | null,
  clickedIso: string,
): { from: string | null; to: string | null } {
  if (!currentFrom || (currentFrom && currentTo)) {
    return { from: clickedIso, to: null };
  }
  if (currentFrom > clickedIso) {
    return { from: clickedIso, to: currentFrom };
  }
  return { from: currentFrom, to: clickedIso };
}

/** Ensure range endpoints are ordered — earlier date is always `from`. */
export function normalizeRangeValue<T extends { date: string | null; time: string | null }>(
  value: { from: T | null; to: T | null } | null,
): { from: T | null; to: T | null } | null {
  if (!value) return null;
  const from = value.from?.date ?? null;
  const to = value.to?.date ?? null;
  if (from && to && from > to) {
    return { from: value.to, to: value.from };
  }
  return value;
}

/** Shared month grid generator — returns raw cell data for a 6×7 grid. */
function generateMonthGrid(
  year: number,
  month: number,
): Array<{ dateStr: string; day: number; isCurrentMonth: boolean }> {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: Array<{ dateStr: string; day: number; isCurrentMonth: boolean }> = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, day: d, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, day: d, isCurrentMonth: true });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, day: d, isCurrentMonth: false });
  }

  return cells;
}

/** Single-mode calendar grid. Range fields default to false. */
export function buildCalendarDays(
  year: number,
  month: number,
  selected: string,
  minDate: Date | null,
  maxDate: Date | null,
  disabledDates: ReadonlySet<string> | null,
): CalendarDay[] {
  const today = todayIsoUtc();
  return generateMonthGrid(year, month).map(({ dateStr, day, isCurrentMonth }) => ({
    date: dateStr,
    day,
    isCurrentMonth,
    isToday: dateStr === today,
    isSelected: dateStr === selected,
    isDisabled: isCalendarDayDisabled(dateStr, minDate, maxDate, disabledDates),
    isRangeStart: false,
    isRangeEnd: false,
    isInRange: false,
    isPreviewInRange: false,
  }));
}

/**
 * Range-mode calendar grid.
 *
 * @param fromDate  - committed/draft range start ISO date (or '')
 * @param toDate    - committed/draft range end ISO date (or '')
 * @param previewAnchor - the fixed anchor date for hover preview (opposite bound)
 * @param hoveredDate   - the date the user is currently hovering over
 */
export function buildRangeCalendarDays(
  year: number,
  month: number,
  fromDate: string,
  toDate: string,
  previewAnchor: string,
  hoveredDate: string,
  minDate: Date | null,
  maxDate: Date | null,
  disabledDates: ReadonlySet<string> | null,
): CalendarDay[] {
  const today = todayIsoUtc();

  // Compute preview bounds (between anchor and hovered date).
  let previewMin = '';
  let previewMax = '';
  if (previewAnchor && hoveredDate && previewAnchor !== hoveredDate) {
    previewMin = previewAnchor < hoveredDate ? previewAnchor : hoveredDate;
    previewMax = previewAnchor < hoveredDate ? hoveredDate : previewAnchor;
  }

  return generateMonthGrid(year, month).map(({ dateStr, day, isCurrentMonth }) => {
    const isRangeStart = !!fromDate && dateStr === fromDate;
    const isRangeEnd = !!toDate && dateStr === toDate;
    const isInRange =
      !!fromDate && !!toDate && dateStr > fromDate && dateStr < toDate;
    const isPreviewInRange =
      !!previewMin &&
      dateStr > previewMin &&
      dateStr < previewMax &&
      !isRangeStart &&
      !isRangeEnd;

    return {
      date: dateStr,
      day,
      isCurrentMonth,
      isToday: dateStr === today,
      isSelected: isRangeStart || isRangeEnd,
      isDisabled: isCalendarDayDisabled(dateStr, minDate, maxDate, disabledDates),
      isRangeStart,
      isRangeEnd,
      isInRange,
      isPreviewInRange,
    };
  });
}
