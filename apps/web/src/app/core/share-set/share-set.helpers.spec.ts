import { describe, expect, it } from 'vitest';
import { parseRecipientUserIdsFromCommaSeparatedInput } from './share-set.helpers';

describe('parseRecipientUserIdsFromCommaSeparatedInput', () => {
  it('parses comma-separated UUIDs', () => {
    const a = '550e8400-e29b-41d4-a716-446655440000';
    const b = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const r = parseRecipientUserIdsFromCommaSeparatedInput(`${a}, ${b}`);
    expect(r).toEqual({ ok: true, ids: [a, b] });
  });

  it('deduplicates', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const r = parseRecipientUserIdsFromCommaSeparatedInput(`${id}, ${id.toUpperCase()}`);
    expect(r).toEqual({ ok: true, ids: [id] });
  });

  it('rejects bad token', () => {
    const r = parseRecipientUserIdsFromCommaSeparatedInput('not-a-uuid');
    expect(r.ok).toBe(false);
  });
});
