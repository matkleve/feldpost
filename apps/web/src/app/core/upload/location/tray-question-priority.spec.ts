/**
 * STUDY-009 idea A (#231) — a tray question's priority comes from its kind.
 *
 * @see docs/specs/service/media-upload-service/upload-tray-question-priority.supplement.md
 * @see docs/study/009-tray-question-budget-and-priority.md
 */

import { describe, expect, it } from 'vitest';
import type { UploadDisambiguationKind } from '../upload-manager.types';
import {
  TRAY_QUESTION_PRIORITY,
  isBudgetSuppressible,
  selectBudgetSuppressible,
  trayQuestionPriority,
} from './tray-question-priority';

/**
 * Every kind in `UploadDisambiguationKind`, written out by hand.
 *
 * The `Record` in the implementation makes an added kind a *compile* error. This list makes a kind
 * quietly dropped from the table a *test* failure, which is the half a type cannot see.
 */
const ALL_KINDS: readonly UploadDisambiguationKind[] = [
  'geocode',
  'source',
  'layer_package',
  'admin_level_conflict',
  'city_step',
  'house_step',
  'containment_check',
];

describe('trayQuestionPriority', () => {
  it('rates the three kinds that decide *where the item is* critical', () => {
    // Wien/1010/Stephansplatz/ with EXIF in Graz: `source` picks which of the two is true.
    expect(trayQuestionPriority('source')).toBe('critical');
    // "Thalistraße 4" with no city: a street without a city is not an address.
    expect(trayQuestionPriority('city_step')).toBe('critical');
    // Hallein (Salzburg) vs Halle (Tirol): the item lands in the wrong Bundesland.
    expect(trayQuestionPriority('admin_level_conflict')).toBe('critical');
  });

  it('rates the three kinds that decide *which correct-looking answer* high', () => {
    // Kirchengasse 11 exists in Wien, Graz and Linz — same street, different town.
    expect(trayQuestionPriority('geocode')).toBe('high');
    expect(trayQuestionPriority('layer_package')).toBe('high');
    expect(trayQuestionPriority('containment_check')).toBe('high');
  });

  it('rates house_step low — Thalistraße 4 vs 6 is right street, right city, off by a building', () => {
    expect(trayQuestionPriority('house_step')).toBe('low');
  });

  it('gives every kind a priority and invents none', () => {
    expect(Object.keys(TRAY_QUESTION_PRIORITY).sort()).toEqual([...ALL_KINDS].sort());
  });

  it('treats a group with no kind as critical, because an unclassified question is not a cheap one', () => {
    expect(trayQuestionPriority(undefined)).toBe('critical');
    expect(trayQuestionPriority(null)).toBe('critical');
  });
});

describe('isBudgetSuppressible — the invariant a budget cannot be built around', () => {
  it('is true for exactly the low kinds', () => {
    for (const kind of ALL_KINDS) {
      expect(isBudgetSuppressible(kind)).toBe(TRAY_QUESTION_PRIORITY[kind] === 'low');
    }
  });

  it('refuses every critical and high kind, whatever the batch looks like', () => {
    const nonLow = ALL_KINDS.filter((kind) => TRAY_QUESTION_PRIORITY[kind] !== 'low');

    expect(nonLow.length).toBeGreaterThan(0);
    for (const kind of nonLow) {
      expect(isBudgetSuppressible(kind)).toBe(false);
    }
  });

  it('refuses an unclassified question', () => {
    expect(isBudgetSuppressible(undefined)).toBe(false);
  });
});

describe('selectBudgetSuppressible', () => {
  it('keeps 300 admin_level_conflict questions and offers only the house_step ones', () => {
    // STUDY-009 § Correction 4: the Company-B shape. A budget has nothing to give here.
    const batch: UploadDisambiguationKind[] = [
      ...Array.from({ length: 300 }, () => 'admin_level_conflict' as const),
      'house_step',
      'house_step',
    ];

    expect(selectBudgetSuppressible(batch, (kind) => kind)).toEqual(['house_step', 'house_step']);
  });

  it('returns nothing when the batch is all critical, rather than falling back to a share of it', () => {
    const allCritical: UploadDisambiguationKind[] = ['city_step', 'source', 'geocode'];

    expect(selectBudgetSuppressible(allCritical, (kind) => kind)).toEqual([]);
  });

  it('works over tray groups, which is how the budget will call it', () => {
    // Shaped like `UploadDisambiguationGroup`: the address is the group identity after merge.
    const groups = [
      { titleAddress: 'Thalistraße 4, Wien', disambiguationKind: 'house_step' as const },
      { titleAddress: 'Kirchengasse 11', disambiguationKind: 'geocode' as const },
      { titleAddress: 'Neuer Ordner', disambiguationKind: undefined },
    ];

    expect(selectBudgetSuppressible(groups, (group) => group.disambiguationKind)).toEqual([
      { titleAddress: 'Thalistraße 4, Wien', disambiguationKind: 'house_step' },
    ]);
  });
});
