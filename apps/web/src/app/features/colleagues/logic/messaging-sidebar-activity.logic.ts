export type MessagingSidebarActivityGroupKey =
  | 'today'
  | 'yesterday'
  | 'lastWeek'
  | 'lastMonth'
  | 'older';

export const MESSAGING_SIDEBAR_ACTIVITY_GROUP_ORDER: readonly MessagingSidebarActivityGroupKey[] = [
  'today',
  'yesterday',
  'lastWeek',
  'lastMonth',
  'older',
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar midnight for date bucketing (today / yesterday). */
function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Whole calendar days between activity date and today in local time. */
export function messagingActivityDaysAgo(activityIso: string, now = new Date()): number {
  const activityDay = startOfLocalDay(new Date(activityIso));
  const today = startOfLocalDay(now);
  return Math.round((today.getTime() - activityDay.getTime()) / DAY_MS);
}

/**
 * Sidebar recency buckets for channels and DMs:
 * - today: calendar today
 * - yesterday: calendar yesterday
 * - lastWeek: day before yesterday through 9 days ago (vorgestern … −1 week)
 * - lastMonth: 10–30 days ago
 * - older: 31+ days ago
 */
export function messagingSidebarActivityGroupKey(
  lastActivityIso: string,
  now = new Date(),
): MessagingSidebarActivityGroupKey {
  const daysAgo = messagingActivityDaysAgo(lastActivityIso, now);

  if (daysAgo <= 0) {
    return 'today';
  }
  if (daysAgo === 1) {
    return 'yesterday';
  }
  if (daysAgo <= 9) {
    return 'lastWeek';
  }
  if (daysAgo <= 30) {
    return 'lastMonth';
  }
  return 'older';
}
