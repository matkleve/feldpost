import {
  applyRangeAnchorDayClick,
  applyRangePickDayClick,
  buildCalendarDays,
  buildRangeCalendarDays,
  isCalendarDayDisabled,
  normalizeRangeValue,
  shiftCalendarMonth,
} from './calendar-picker.helpers';

describe('calendar-picker.helpers', () => {
  it('disables days before minDate and after maxDate', () => {
    const min = new Date(Date.UTC(2026, 2, 5));
    const max = new Date(Date.UTC(2026, 2, 20));
    expect(isCalendarDayDisabled('2026-03-01', min, max, null)).toBe(true);
    expect(isCalendarDayDisabled('2026-03-10', min, max, null)).toBe(false);
    expect(isCalendarDayDisabled('2026-03-25', min, max, null)).toBe(true);
  });

  it('buildCalendarDays marks disabled cells', () => {
    const days = buildCalendarDays(
      2026,
      2,
      '2026-03-10',
      new Date(Date.UTC(2026, 2, 5)),
      new Date(Date.UTC(2026, 2, 20)),
      null,
    );
    const before = days.find((d) => d.date === '2026-03-01');
    const inside = days.find((d) => d.date === '2026-03-10');
    expect(before?.isDisabled).toBe(true);
    expect(inside?.isDisabled).toBe(false);
  });

  it('shiftCalendarMonth rolls year at boundaries', () => {
    expect(shiftCalendarMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftCalendarMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('buildRangeCalendarDays highlights only committed endpoints', () => {
    const mayDays = buildRangeCalendarDays(
      2026,
      4,
      '2026-05-22',
      '',
      '2026-05-22',
      '2026-05-28',
      null,
      null,
      null,
    );
    const start = mayDays.find((d) => d.date === '2026-05-22');
    const preview = mayDays.find((d) => d.date === '2026-05-25');

    expect(start?.isRangeStart).toBe(true);
    expect(start?.isRangeEnd).toBe(false);
    expect(preview?.isPreviewInRange).toBe(true);
    expect(mayDays.some((d) => d.isRangeEnd)).toBe(false);
  });

  it('normalizeRangeValue swaps unordered endpoints', () => {
    const normalized = normalizeRangeValue({
      from: { date: '2026-05-22', time: null },
      to: { date: '2026-04-09', time: null },
    });
    expect(normalized?.from?.date).toBe('2026-04-09');
    expect(normalized?.to?.date).toBe('2026-05-22');
  });

  it('applyRangeAnchorDayClick replaces from only on anchor-from', () => {
    expect(applyRangeAnchorDayClick('from', null, null, '2026-05-10')).toEqual({
      from: '2026-05-10',
      to: null,
    });
    expect(applyRangeAnchorDayClick('from', '2026-05-01', null, '2026-05-20')).toEqual({
      from: '2026-05-20',
      to: null,
    });
    expect(applyRangeAnchorDayClick('from', '2026-05-01', '2026-05-28', '2026-05-20')).toEqual({
      from: '2026-05-20',
      to: '2026-05-28',
    });
  });

  it('applyRangeAnchorDayClick replaces to only on anchor-to', () => {
    expect(applyRangeAnchorDayClick('to', '2026-05-01', null, '2026-05-28')).toEqual({
      from: '2026-05-01',
      to: '2026-05-28',
    });
    expect(applyRangeAnchorDayClick('to', '2026-05-28', '2026-05-01', '2026-05-15')).toEqual({
      from: '2026-05-15',
      to: '2026-05-28',
    });
  });

  it('applyRangePickDayClick uses two-click range then restarts', () => {
    expect(applyRangePickDayClick(null, null, '2026-05-10')).toEqual({
      from: '2026-05-10',
      to: null,
    });
    expect(applyRangePickDayClick('2026-05-10', null, '2026-05-28')).toEqual({
      from: '2026-05-10',
      to: '2026-05-28',
    });
    expect(applyRangePickDayClick('2026-05-10', '2026-05-28', '2026-05-15')).toEqual({
      from: '2026-05-15',
      to: null,
    });
    expect(applyRangePickDayClick('2026-05-28', '2026-05-10', '2026-05-15')).toEqual({
      from: '2026-05-15',
      to: null,
    });
  });
});
