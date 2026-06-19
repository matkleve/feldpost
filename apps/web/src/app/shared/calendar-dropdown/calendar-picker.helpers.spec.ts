import { buildCalendarDays, isCalendarDayDisabled } from './calendar-picker.helpers';

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
});
