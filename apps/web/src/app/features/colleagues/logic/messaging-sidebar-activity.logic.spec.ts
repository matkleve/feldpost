import { describe, expect, it } from 'vitest';
import {
  messagingActivityDaysAgo,
  messagingSidebarActivityGroupKey,
} from './messaging-sidebar-activity.logic';

describe('messagingSidebarActivityGroupKey', () => {
  const now = new Date('2026-06-16T15:00:00');

  it('maps calendar today and yesterday', () => {
    expect(messagingSidebarActivityGroupKey('2026-06-16T08:00:00', now)).toBe('today');
    expect(messagingSidebarActivityGroupKey('2026-06-15T22:00:00', now)).toBe('yesterday');
  });

  it('maps last week from vorgestern through nine days ago', () => {
    expect(messagingSidebarActivityGroupKey('2026-06-14T12:00:00', now)).toBe('lastWeek');
    expect(messagingSidebarActivityGroupKey('2026-06-07T12:00:00', now)).toBe('lastWeek');
  });

  it('maps last month and older', () => {
    expect(messagingSidebarActivityGroupKey('2026-06-06T12:00:00', now)).toBe('lastMonth');
    expect(messagingSidebarActivityGroupKey('2026-05-20T12:00:00', now)).toBe('lastMonth');
    expect(messagingSidebarActivityGroupKey('2026-04-01T12:00:00', now)).toBe('older');
  });
});

describe('messagingActivityDaysAgo', () => {
  it('uses local calendar days', () => {
    const now = new Date('2026-06-16T10:00:00');
    expect(messagingActivityDaysAgo('2026-06-16T02:00:00', now)).toBe(0);
    expect(messagingActivityDaysAgo('2026-06-15T23:00:00', now)).toBe(1);
    expect(messagingActivityDaysAgo('2026-06-14T12:00:00', now)).toBe(2);
  });
});
