/**
 * D-09 / Phase 5.7 — EXIF may supply a house number, confirm-only.
 *
 * @see docs/specs/service/media-upload-service/upload-exif-house-number.supplement.md
 * @see docs/study/007-exif-coordinates-as-address-evidence.md
 */

import { describe, expect, it } from 'vitest';
import {
  EXIF_TO_HOUSE_NUMBER_RULE,
  exifHouseNumberProposal,
  exifHouseNumberProposalKey,
} from './exif-house-number';

/** Stephansplatz, Wien. The "street position" a forward geocode of the path would return. */
const STREET_POSITION = { lat: 48.2082, lng: 16.3738 };

/** ~30 m north of it — the photographer on the pavement. */
const NEARBY = { lat: 48.20847, lng: 16.3738 };

/** ~300 m away — across the square, a different building. */
const FAR = { lat: 48.2109, lng: 16.3738 };

function input(overrides: Partial<Parameters<typeof exifHouseNumberProposal>[0]> = {}) {
  return {
    establishedStreet: 'Stephansplatz',
    establishedHouseNumber: null,
    exifCoords: NEARBY,
    reverse: { street: 'Stephansplatz', houseNumber: '1' },
    streetPosition: STREET_POSITION,
    radiusMeters: 50,
    ...overrides,
  };
}

describe('exifHouseNumberProposal', () => {
  it('proposes the reverse-geocoded number when the street matches and the point is close', () => {
    const decision = exifHouseNumberProposal(input());

    expect(decision.propose).toBe(true);
    expect(decision).toMatchObject({ houseNumber: '1', rule: EXIF_TO_HOUSE_NUMBER_RULE });
  });

  it('marks the proposal derived, never found — it is not in the path', () => {
    const decision = exifHouseNumberProposal(input());

    expect(decision).toMatchObject({ origin: 'derived' });
  });

  // ── The load-bearing guard ────────────────────────────────────────────────

  it('changes nothing when the reverse-geocoded street differs', () => {
    // GPS records where the camera stood. A photo taken from the pavement opposite can sit nearer
    // the building behind the photographer; without this check the pipeline numbers that building.
    const decision = exifHouseNumberProposal(
      input({ reverse: { street: 'Rotenturmstraße', houseNumber: '9' } }),
    );

    expect(decision).toEqual({ propose: false, reason: 'street_mismatch' });
  });

  it('compares streets through the same fold the grouping key uses, not raw equality', () => {
    // `Wasagasse` vs `Wasagase` is one place; a raw !== would call it a different street and
    // silently drop a legitimate proposal.
    const decision = exifHouseNumberProposal(
      input({
        establishedStreet: 'Wasagasse',
        reverse: { street: 'Wasagase', houseNumber: '4' },
      }),
    );

    expect(decision.propose).toBe(true);
  });

  it('folds abbreviations too — Argentinierstr. is Argentinierstraße', () => {
    const decision = exifHouseNumberProposal(
      input({
        establishedStreet: 'Argentinierstraße',
        reverse: { street: 'Argentinierstr.', houseNumber: '21' },
      }),
    );

    expect(decision.propose).toBe(true);
  });

  // ── The other four rows of the guard table ────────────────────────────────

  it('changes nothing when the point is outside the radius', () => {
    expect(exifHouseNumberProposal(input({ exifCoords: FAR }))).toEqual({
      propose: false,
      reason: 'outside_radius',
    });
  });

  it('changes nothing when no street was established from the path', () => {
    expect(exifHouseNumberProposal(input({ establishedStreet: null }))).toEqual({
      propose: false,
      reason: 'no_street_established',
    });
  });

  it('changes nothing when the path already supplied a house number', () => {
    // The path is the stronger evidence; EXIF confirms, it does not override.
    expect(exifHouseNumberProposal(input({ establishedHouseNumber: '7' }))).toEqual({
      propose: false,
      reason: 'house_number_already_known',
    });
  });

  it('changes nothing when the photo has no GPS', () => {
    expect(exifHouseNumberProposal(input({ exifCoords: null }))).toEqual({
      propose: false,
      reason: 'no_exif_coordinates',
    });
  });

  it('changes nothing when the reverse geocode returned no house number', () => {
    expect(
      exifHouseNumberProposal(input({ reverse: { street: 'Stephansplatz', houseNumber: null } })),
    ).toEqual({ propose: false, reason: 'reverse_has_no_house_number' });
  });

  it('changes nothing when there is no reverse result at all', () => {
    expect(exifHouseNumberProposal(input({ reverse: null }))).toEqual({
      propose: false,
      reason: 'no_reverse_result',
    });
  });

  // ── The radius is a decision, not a default ───────────────────────────────

  it('is inert until a radius is configured, rather than falling back to a guessed one', () => {
    // STUDY-007 § 7 declines to name a value without real device photos. A silent default would be
    // exactly the invention the address precision principle forbids.
    expect(exifHouseNumberProposal(input({ radiusMeters: null }))).toEqual({
      propose: false,
      reason: 'radius_not_configured',
    });
  });

  it('never borrows exifAssistRadiusMeters — 80 m holds a whole terrace row', () => {
    // A point 70 m away is inside exifAssistRadiusMeters but outside a house-scale radius.
    const seventyMetresOut = { lat: 48.20883, lng: 16.3738 };

    expect(exifHouseNumberProposal(input({ exifCoords: seventyMetresOut, radiusMeters: 50 }))).toEqual(
      { propose: false, reason: 'outside_radius' },
    );
  });
});

describe('exifHouseNumberProposalKey', () => {
  it('gives one key per proposed address, so twenty files ask once', () => {
    const a = exifHouseNumberProposalKey({
      street: 'Stephansplatz',
      houseNumber: '1',
      areaKey: 'wien|1010',
    });
    const b = exifHouseNumberProposalKey({
      street: 'Stephansplatz',
      houseNumber: '1',
      areaKey: 'wien|1010',
    });

    expect(a).toBe(b);
  });

  it('folds the street into the key, so spelling twins do not ask twice', () => {
    expect(
      exifHouseNumberProposalKey({ street: 'Wasagasse', houseNumber: '4', areaKey: 'wien|1090' }),
    ).toBe(
      exifHouseNumberProposalKey({ street: 'Wasagase', houseNumber: '4', areaKey: 'wien|1090' }),
    );
  });

  it('separates different house numbers on the same street', () => {
    expect(
      exifHouseNumberProposalKey({ street: 'Wasagasse', houseNumber: '4', areaKey: 'wien|1090' }),
    ).not.toBe(
      exifHouseNumberProposalKey({ street: 'Wasagasse', houseNumber: '6', areaKey: 'wien|1090' }),
    );
  });

  it('separates the same address in different areas', () => {
    expect(
      exifHouseNumberProposalKey({ street: 'Hauptplatz', houseNumber: '1', areaKey: 'graz|8010' }),
    ).not.toBe(
      exifHouseNumberProposalKey({ street: 'Hauptplatz', houseNumber: '1', areaKey: 'linz|4020' }),
    );
  });
});
