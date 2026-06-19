/** Panel / dropdown wire value — ISO UTC date + optional 24h time. */
export interface CalendarDropdownValue {
  date: string | null;
  time: string | null;
}

/** Alias retained for media-detail save handlers. */
export type DateSaveEvent = CalendarDropdownValue;

export type TimeMode = 'dateOnly' | 'optionalTime' | 'requiredTime';

export interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}
