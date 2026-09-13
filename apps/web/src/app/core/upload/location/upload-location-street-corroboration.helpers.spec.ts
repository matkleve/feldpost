import { describe, expect, it } from 'vitest';
import {
  STREET_TO_CITY_CORROBORATION_RULE,
  analyzeStreetCorroborationHits,
  buildSuggestedCityCandidate,
  pickStreetCorroborationPinHit,
  writeStreetCorroboratedCity,
} from './upload-location-street-corroboration.helpers';
import type { UploadSearchObject } from '../address-resolution/upload-address-resolution.types';

function hit(city: string, houseNumber?: string, importance = 0.5) {
  return {
    lat: 47.26,
    lng: 11.39,
    displayName: `Hauptstraße${houseNumber ? ` ${houseNumber}` : ''}, ${city}`,
    name: 'Hauptstraße',
    importance,
    address: { road: 'Hauptstraße', house_number: houseNumber, city },
  };
}

describe('analyzeStreetCorroborationHits', () => {
  it('auto-resolves when every hit agrees on one city that is a folder candidate', () => {
    const outcome = analyzeStreetCorroborationHits(
      [hit('Innsbruck', '5'), hit('Innsbruck', '7')],
      ['Wien', 'Innsbruck'],
    );
    expect(outcome).toMatchObject({ kind: 'auto', city: 'Innsbruck' });
  });

  it('matches case- and accent-insensitively against the folder\'s own casing', () => {
    const outcome = analyzeStreetCorroborationHits([hit('innsbrück')], ['Wien', 'Innsbruck']);
    expect(outcome).toMatchObject({ kind: 'auto', city: 'Innsbruck' });
  });

  it('suggests when every hit agrees on one city that is not a folder candidate', () => {
    const outcome = analyzeStreetCorroborationHits([hit('Salzburg')], ['Wien', 'Innsbruck']);
    expect(outcome).toMatchObject({ kind: 'suggest', city: 'Salzburg' });
  });

  it('is a tie when hits disagree on city — no single clean answer', () => {
    const outcome = analyzeStreetCorroborationHits(
      [hit('Wien'), hit('Innsbruck')],
      ['Wien', 'Innsbruck'],
    );
    expect(outcome).toEqual({ kind: 'none' });
  });

  it('is none for zero hits', () => {
    expect(analyzeStreetCorroborationHits([], ['Wien', 'Innsbruck'])).toEqual({ kind: 'none' });
  });

  it('ignores hits with no city at all when deciding, but a tie still blocks on the rest', () => {
    const noCity = { ...hit('Wien'), address: { road: 'Hauptstraße' } };
    const outcome = analyzeStreetCorroborationHits([noCity, hit('Innsbruck')], ['Wien', 'Innsbruck']);
    expect(outcome).toMatchObject({ kind: 'auto', city: 'Innsbruck' });
  });
});

describe('pickStreetCorroborationPinHit', () => {
  it('prefers the hit whose own house_number matches, never assuming it', () => {
    const hits = [hit('Innsbruck', '3'), hit('Innsbruck', '5')];
    expect(pickStreetCorroborationPinHit(hits, '5')).toBe(hits[1]);
  });

  it('falls back to the top-ranked hit when no house number matches exactly', () => {
    const hits = [hit('Innsbruck', '3'), hit('Innsbruck', '9')];
    expect(pickStreetCorroborationPinHit(hits, '5')).toBe(hits[0]);
  });

  it('falls back to the top-ranked hit when the Search Object has no house number', () => {
    const hits = [hit('Innsbruck')];
    expect(pickStreetCorroborationPinHit(hits, null)).toBe(hits[0]);
  });
});

describe('buildSuggestedCityCandidate', () => {
  it('names the evidence directly, asymmetric with the folder\'s own plain candidate labels', () => {
    const candidate = buildSuggestedCityCandidate('Salzburg', ['Wien', 'Innsbruck']);
    expect(candidate.addressLabel).toBe(
      'Salzburg — the street was found here, not in Wien or Innsbruck. Did you mean Salzburg?',
    );
    expect(candidate.id).toContain('admin-level|city|');
  });
});

describe('writeStreetCorroboratedCity', () => {
  const geo = { municipalities: [{ n: 'Innsbruck', b: 'Tirol' }], postcodeMap: {} };

  function baseSo(): UploadSearchObject {
    return {
      country: 'AT',
      state: null,
      postcode: null,
      city: null,
      street: 'Hauptstraße',
      houseNumber: '5',
      staircase: null,
      door: null,
      project: null,
      sources: [],
      sourceDeviations: [],
      postcodeCandidates: [],
      uncertainFields: [],
      groupingKey: 'at||||hauptstrasse|5',
      relativePath: 'AT/Wien/Innsbruck/Hauptstraße 5/photo.jpg',
      fileName: 'photo.jpg',
      areaEvidence: {
        city: [
          { level: 1, value: 'Wien', source: 'folder', field: 'city' },
          { level: 2, value: 'Innsbruck', source: 'folder', field: 'city' },
        ],
      },
      areaConflicts: [
        {
          field: 'city',
          entries: [
            { level: 1, value: 'Wien', source: 'folder', field: 'city' },
            { level: 2, value: 'Innsbruck', source: 'folder', field: 'city' },
          ],
        },
      ],
    };
  }

  it('writes the city with derived provenance, not plain path evidence', () => {
    const result = writeStreetCorroboratedCity(baseSo(), 'Innsbruck', 'Hauptstraße', geo);
    expect(result.city).toBe('Innsbruck');
    expect(result.areaEvidence?.city).toEqual([
      expect.objectContaining({
        value: 'Innsbruck',
        origin: 'derived',
        rule: STREET_TO_CITY_CORROBORATION_RULE,
        derivedFrom: 'Hauptstraße',
      }),
    ]);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'city',
          value: 'Innsbruck',
          origin: 'derived',
          rule: STREET_TO_CITY_CORROBORATION_RULE,
        }),
      ]),
    );
  });

  it('clears the area conflict now that a single city is settled', () => {
    const result = writeStreetCorroboratedCity(baseSo(), 'Innsbruck', 'Hauptstraße', geo);
    expect(result.areaConflicts).toEqual([]);
  });

  it('rebuilds groupingKey to the real address key, not the admin-conflict key', () => {
    const result = writeStreetCorroboratedCity(baseSo(), 'Innsbruck', 'Hauptstraße', geo);
    expect(result.groupingKey).not.toBe(baseSo().groupingKey);
    expect(result.groupingKey.toLowerCase()).toContain('innsbruck');
  });
});
