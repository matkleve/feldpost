import { describe, expect, it } from 'vitest';
import { classifyTokensInSegment } from './path-token-classifier';

const geo = {
  states: [
    { n: 'Salzburg', a: [] },
    { n: 'Wien', a: [] },
  ],
  municipalities: [
    { n: 'Salzburg', b: 'Salzburg', a: [] },
    { n: 'Krems', b: 'Niederösterreich', a: [] },
  ],
};

describe('classifyTokensInSegment', () => {
  it('emits both state and city for Salzburg', () => {
    const tokens = classifyTokensInSegment(['Salzburg'], geo, { country: 'AT' });
    const kinds = tokens.map((t) => t.kind);
    expect(kinds).toContain('state');
    expect(kinds).toContain('city');
  });

  it('classifies Kremser Straße as street via keyword merge', () => {
    const tokens = classifyTokensInSegment(['Kremser', 'Straße'], geo, { country: 'AT' });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('street');
    expect(tokens[0].value).toBe('Kremser Straße');
  });

  it('classifies Kremserstraße suffix as street', () => {
    const tokens = classifyTokensInSegment(['Kremserstraße'], geo, { country: 'AT' });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('street');
  });

  it('merges Token + Gasse into one street token', () => {
    const tokens = classifyTokensInSegment(['Mariahilfer', 'Gasse'], geo, { country: 'AT' });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('street');
    expect(tokens[0].value).toBe('Mariahilfer Gasse');
  });

  it('classifies -weg suffix as street without city fuzzy match', () => {
    const tokens = classifyTokensInSegment(['Donauweg'], geo, { country: 'AT' });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('street');
    expect(tokens.every((t) => t.kind !== 'city')).toBe(true);
  });

  it('does not emit city for Kremser when merged as street', () => {
    const tokens = classifyTokensInSegment(['Kremser', 'Straße'], geo, { country: 'AT' });
    expect(tokens.every((t) => t.kind !== 'city')).toBe(true);
  });
});

// ── Gazetteer matching (D-02) ────────────────────────────────────────────────
// @see docs/specs/service/media-upload-service/upload-search-object.md § Token classification order
describe('classifyTokensInSegment — gazetteer matching', () => {
  /** No plain "Wien": the real at-gemeinden-bev.json has Wien-Alsergrund … and Schottwien. */
  const viennaGap = {
    states: [{ n: 'Wien', a: ['vienna'] }],
    municipalities: [
      { n: 'Schottwien', b: 'Niederösterreich', a: [] },
      { n: 'Wien-Alsergrund', b: 'Wien', a: [] },
      { n: 'Maria-Lanzendorf', b: 'Niederösterreich', a: [] },
      { n: 'Klagenfurt', b: 'Kärnten', a: [] },
    ],
  };

  it('does not substitute a longer municipality for a token the gazetteer lacks', () => {
    const tokens = classifyTokensInSegment(['Wien'], viennaGap, { country: 'AT' });
    const city = tokens.find((t) => t.kind === 'city');

    expect(city?.value).not.toBe('Schottwien');
    expect(city?.value).not.toBe('Wien-Alsergrund');
  });

  it('still classifies the state for that token', () => {
    const tokens = classifyTokensInSegment(['Wien'], viennaGap, { country: 'AT' });

    expect(tokens.find((t) => t.kind === 'state')?.value).toBe('Wien');
  });

  it('does not substitute a long hyphenated municipality for a short first name', () => {
    const tokens = classifyTokensInSegment(['Maria'], viennaGap, { country: 'AT' });

    expect(tokens.find((t) => t.kind === 'city')?.value).not.toBe('Maria-Lanzendorf');
  });

  it('matches an exact municipality name at full confidence', () => {
    const tokens = classifyTokensInSegment(['Klagenfurt'], viennaGap, { country: 'AT' });
    const city = tokens.find((t) => t.kind === 'city');

    expect(city?.value).toBe('Klagenfurt');
    expect(city?.confidence).toBe(1);
  });

  it('matches an alias exactly', () => {
    const tokens = classifyTokensInSegment(['vienna'], viennaGap, { country: 'AT' });

    expect(tokens.find((t) => t.kind === 'state')?.value).toBe('Wien');
  });

  // Not a typo-tolerance test: `Klagenfurth` matches nothing today either, because the 0.9
  // confidence floor already rejects near misses. Recorded so the length bound is not blamed
  // for it later. @see docs/study/005-upload-pipeline-trace-findings.md F-02
  it('leaves a near-miss unmatched, as it already did', () => {
    const tokens = classifyTokensInSegment(['Klagenfurth'], viennaGap, { country: 'AT' });

    expect(tokens.find((t) => t.kind === 'city')).toBeUndefined();
  });
});
