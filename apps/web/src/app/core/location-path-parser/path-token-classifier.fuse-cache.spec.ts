import { describe, expect, it } from 'vitest';
import { classifyTokensInSegment, fuseIndexFor } from './path-token-classifier';

/**
 * Guarantees of the gazetteer lookup contract.
 * @see docs/specs/service/media-upload-service/upload-search-object.gazetteer-lookup.supplement.md
 *
 * "Built once per dataset" is asserted as index **identity**, not as a construction count: the
 * Angular test builder bundles `fuse.js`, so a `vi.mock` on it never intercepts and would silently
 * count zero — a test that passes for the wrong reason, and one that fails only in a full run.
 */

/**
 * A fresh dataset pair per test. The caches are keyed by array identity and live in a module-level
 * `WeakMap`, so distinct arrays are what keeps the tests independent of each other.
 */
function makeGeo(cities: string[]) {
  return {
    states: [{ n: 'Salzburg', a: [] }],
    municipalities: cities.map((n) => ({ n, b: 'Niederösterreich', a: [] })),
  };
}

describe('path token classifier · gazetteer index caching', () => {
  it('G2: one index per dataset — classifying many tokens never rebuilds it', () => {
    const geo = makeGeo(['Krems', 'Schottwien']);
    // Tokens that miss the exact index, so each one reaches the fuzzy stage.
    const misses = ['Zwentendorf', 'Hollabrunn', 'Gaaden', 'Perchtoldsdorf', 'Klosterneuburg'];

    const before = fuseIndexFor(geo.municipalities);
    for (const token of misses) {
      classifyTokensInSegment([token], geo, { country: 'AT' });
    }

    expect(fuseIndexFor(geo.municipalities)).toBe(before);
    expect(fuseIndexFor(geo.states)).toBe(fuseIndexFor(geo.states));
  });

  it('G3: a cached lookup returns exactly what an uncached one returned', () => {
    const geo = makeGeo(['Krems', 'Schottwien']);

    const first = classifyTokensInSegment(['Kremss'], geo, { country: 'AT' });
    const second = classifyTokensInSegment(['Kremss'], geo, { country: 'AT' });

    expect(second).toEqual(first);
  });

  it('G4: a different dataset array gets its own index and its own answers', () => {
    const a = makeGeo(['Krems']);
    const b = makeGeo(['Hollabrunn']);

    expect(fuseIndexFor(a.municipalities)).not.toBe(fuseIndexFor(b.municipalities));

    // A fuzzy (not exact) token: it must resolve inside b's dataset, and a must not answer it.
    const inB = classifyTokensInSegment(['Hollabrun'], b, { country: 'AT' }).find(
      (t) => t.kind === 'city',
    );
    const inA = classifyTokensInSegment(['Hollabrun'], a, { country: 'AT' }).find(
      (t) => t.kind === 'city',
    );

    expect(inB?.value).toBe('Hollabrunn');
    expect(inA).toBeUndefined();
  });

  it('G1: an exact hit still beats a fuzzy one, and Wien is not Schottwien', () => {
    const geo = {
      states: [{ n: 'Wien', a: [] }],
      municipalities: [
        { n: 'Schottwien', b: 'Niederösterreich', a: [] },
        { n: 'Wien', b: 'Wien', a: [] },
      ],
    };

    const city = classifyTokensInSegment(['Wien'], geo, { country: 'AT' }).find(
      (t) => t.kind === 'city',
    );

    expect(city?.value).toBe('Wien');
    expect(city?.confidence).toBe(1);
  });

  it('G5: an empty dataset classifies nothing', () => {
    const empty = { states: [], municipalities: [] };

    const tokens = classifyTokensInSegment(['Zwentendorf'], empty, { country: 'AT' });

    expect(tokens.filter((t) => t.kind === 'city' || t.kind === 'state')).toEqual([]);
  });
});
