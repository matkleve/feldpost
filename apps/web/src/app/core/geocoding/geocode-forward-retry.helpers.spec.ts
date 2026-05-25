import { describe, expect, it } from 'vitest';
import { buildForwardGeocodeRetryQueries } from './geocode-forward-retry.helpers';

describe('buildForwardGeocodeRetryQueries', () => {
  it('adds default locality anchor when address has no comma', () => {
    expect(buildForwardGeocodeRetryQueries('Fuchsthalergasse 4')).toEqual([
      'Fuchsthalergasse 4',
      'Fuchsthalergasse 4, Wien, Österreich',
    ]);
  });

  it('does not duplicate anchor when city is already present', () => {
    expect(buildForwardGeocodeRetryQueries('Arsenalstrasse 3, Wien')).toEqual([
      'Arsenalstrasse 3, Wien',
    ]);
  });
});
