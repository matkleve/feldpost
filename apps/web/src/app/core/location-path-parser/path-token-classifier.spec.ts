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
