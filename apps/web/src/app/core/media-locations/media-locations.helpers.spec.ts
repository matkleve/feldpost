import { describe, expect, it } from 'vitest';
import { formatLocationDisplayLine, locationMatchesQuery } from './media-locations.helpers';
import type { MediaItemLocationRow } from './media-locations.types';

describe('formatLocationDisplayLine', () => {
  it('formats street, house number, staircase, and door', () => {
    const line = formatLocationDisplayLine(
      {
        street: 'Hauptstrasse',
        house_number: '12',
        staircase: 'A',
        door: '4',
        address_label: null,
      },
      'Top',
    );
    expect(line).toBe('Hauptstrasse 12, A, Top 4');
  });

  it('omits empty optional segments', () => {
    const line = formatLocationDisplayLine(
      {
        street: 'Ring',
        house_number: '1',
        staircase: null,
        door: null,
        address_label: null,
      },
      'Top',
    );
    expect(line).toBe('Ring 1');
  });
});

describe('locationMatchesQuery', () => {
  const row = {
    street: 'Bahnhof',
    house_number: '7',
  } as MediaItemLocationRow;

  it('matches substring', () => {
    expect(locationMatchesQuery(row, 'bahn')).toBe(true);
  });

  it('returns true for empty query', () => {
    expect(locationMatchesQuery(row, '')).toBe(true);
  });
});
