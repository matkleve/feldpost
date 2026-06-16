import { describe, expect, it } from 'vitest';
import {
  MAX_VALIDITY_DAYS,
  assertValidityWindow,
  deriveReusableStatus,
  partitionReusables,
} from './invites.helpers';

describe('invites.helpers', () => {
  const now = new Date('2026-06-16T12:00:00.000Z');

  it('rejects validity windows longer than 365 days', () => {
    const start = '2026-01-01T00:00:00.000Z';
    const tooLong = '2027-01-02T00:00:00.000Z';

    expect(() => assertValidityWindow(null, tooLong, start, now)).toThrow(
      `Validity window cannot exceed ${MAX_VALIDITY_DAYS} days.`,
    );
  });

  it('accepts validity windows within 365 days', () => {
    const start = '2026-01-01T00:00:00.000Z';
    const end = '2026-12-31T00:00:00.000Z';

    expect(() => assertValidityWindow(null, end, start, now)).not.toThrow();
  });

  it('derives reusable status from row state', () => {
    expect(
      deriveReusableStatus(
        {
          status: 'active',
          valid_from: null,
          expires_at: '2026-12-31T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('active');

    expect(
      deriveReusableStatus(
        {
          status: 'revoked',
          valid_from: null,
          expires_at: '2026-12-31T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('paused');

    expect(
      deriveReusableStatus(
        {
          status: 'active',
          valid_from: '2026-07-01T00:00:00.000Z',
          expires_at: '2026-12-31T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('scheduled');

    expect(
      deriveReusableStatus(
        {
          status: 'active',
          valid_from: null,
          expires_at: '2026-01-01T00:00:00.000Z',
        },
        now,
      ),
    ).toBe('expired');
  });

  it('partitions reusables into active and expired buckets', () => {
    const rows = [
      { expires_at: '2026-12-31T00:00:00.000Z' },
      { expires_at: '2026-01-01T00:00:00.000Z' },
      { expires_at: '2026-06-17T00:00:00.000Z' },
    ];

    const { active, expired } = partitionReusables(rows, now);

    expect(active).toHaveLength(2);
    expect(expired).toHaveLength(1);
    expect(expired[0]?.expires_at).toBe('2026-01-01T00:00:00.000Z');
  });
});
