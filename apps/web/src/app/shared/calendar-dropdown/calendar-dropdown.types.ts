/** Panel / dropdown wire value — ISO UTC date + optional 24h time. */
export interface CalendarDropdownValue {
  date: string | null;
  time: string | null;
}

/** Alias retained for media-detail save handlers. */
export type DateSaveEvent = CalendarDropdownValue;

export type TimeMode = 'dateOnly' | 'optionalTime' | 'requiredTime';

/** Range wire value — each half is a single CalendarDropdownValue. */
export interface CalendarRangeValue {
  from: CalendarDropdownValue | null;
  to: CalendarDropdownValue | null;
}

/** Range popover open FSM — field anchor, or `pick` for two-click range via center control. */
export type RangeAnchorTarget = 'from' | 'to' | 'pick';

export interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  /** Single mode: the selected day. Range mode: true when isRangeStart || isRangeEnd. */
  isSelected: boolean;
  isDisabled: boolean;
  /** Range mode only — false in single mode. */
  isRangeStart: boolean;
  isRangeEnd: boolean;
  /** Strictly between start and end (exclusive of endpoints). */
  isInRange: boolean;
  /** Hover-preview wash — between the fixed anchor and the currently hovered date. */
  isPreviewInRange: boolean;
}
