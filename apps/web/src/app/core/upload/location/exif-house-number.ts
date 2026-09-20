/**
 * D-09 / STUDY-006 Phase 5.7 — EXIF may supply a house number, **confirm-only**.
 *
 * When a path establishes a street but no house number, and the photo carries GPS, the pipeline may
 * propose the house number that GPS reverse-geocodes to. It must **ask** before adopting it.
 *
 * Why asking is what makes this legal: the address precision principle forbids fabricating
 * precision. A confirmation does not fabricate — it presents a proposal with its provenance shown,
 * and the user decides. Writing the number silently would be the violation; asking is the opposite
 * of it.
 *
 * This module is the decision only. It performs no I/O, opens no tray and writes nothing: callers
 * hand it the evidence they already have and act on the verdict. That keeps the guard — the part
 * that is load-bearing and easy to get wrong — testable without a geocoder.
 *
 * @see docs/specs/service/media-upload-service/upload-exif-house-number.supplement.md
 * @see docs/study/007-exif-coordinates-as-address-evidence.md
 */

import { haversineMetersBetween } from '../../geo/haversine.util';
import { normalizeStreetForGroupingKey } from '../../location-path-parser/location-path-parser.util';

/** Same `from→to` shape as `city→state`, `postcode→city`, `place→country`. */
export const EXIF_TO_HOUSE_NUMBER_RULE = 'exif→houseNumber';

export type ExifHouseNumberSkipReason =
  /** The radius has never been chosen. See the note on `radiusMeters` below. */
  | 'radius_not_configured'
  /** No street from the path — that is the area-only / Issues path, not a house-number question. */
  | 'no_street_established'
  /** The path already said it. Path evidence is stronger; EXIF confirms, it does not override. */
  | 'house_number_already_known'
  | 'no_exif_coordinates'
  | 'no_reverse_result'
  | 'reverse_has_no_house_number'
  /** The guard. See `streetsMatch`. */
  | 'street_mismatch'
  | 'outside_radius';

export interface ExifHouseNumberInput {
  /** Street the path established, as found evidence. */
  establishedStreet: string | null;
  /** House number the path established, if any. A value here ends the question. */
  establishedHouseNumber: string | null;
  /** Where the camera was. Not where the subject is — that distinction is this module's whole job. */
  exifCoords: { lat: number; lng: number } | null;
  /** What reverse-geocoding the EXIF point returned. */
  reverse: { street: string | null; houseNumber: string | null } | null;
  /** Forward-geocoded position of the established street — what the radius is measured to. */
  streetPosition: { lat: number; lng: number } | null;
  /**
   * House-scale radius in metres, or `null` when unset.
   *
   * **This must not be `exifAssistRadiusMeters` (80 m).** That value answers a different question —
   * *"which of these candidates does the GPS favour"* — where 80 m usefully contains one candidate.
   * For *"is this the house"*, 80 m contains an entire terrace row.
   *
   * `null` makes the rule inert rather than falling back to a guess. STUDY-007 § 7 declines to name
   * a value without a real device export (fifty photos of known buildings would settle it), and a
   * silent default would be exactly the invented precision this rule exists to avoid. Choosing the
   * number is a decision, tracked in issue #221.
   */
  radiusMeters: number | null;
}

export interface ExifHouseNumberProposal {
  propose: true;
  houseNumber: string;
  /** Written as ordinary evidence — no special-casing, no second write path. */
  origin: 'derived';
  rule: typeof EXIF_TO_HOUSE_NUMBER_RULE;
  /** Carried so the confirmation can show how far the camera was from the street. */
  distanceMeters: number;
}

export type ExifHouseNumberDecision =
  | ExifHouseNumberProposal
  | { propose: false; reason: ExifHouseNumberSkipReason };

/**
 * Streets are compared through `normalizeStreetForGroupingKey`, the same fold the grouping key and
 * the layer-package compare use (street-fold contract S5). Raw `!==` would read `Wasagasse` and
 * `Wasagase`, or `Argentinierstr.` and `Argentinierstraße`, as different streets and drop a
 * legitimate proposal — and it would do so silently, since the skip reason looks identical to a
 * genuine mismatch.
 */
function streetsMatch(a: string | null, b: string | null): boolean {
  const left = normalizeStreetForGroupingKey(a);
  const right = normalizeStreetForGroupingKey(b);
  return left !== '' && left === right;
}

/**
 * Decide whether EXIF may propose a house number for this item.
 *
 * The order of the guards is deliberate: the cheapest and most decisive checks run first, and
 * `street_mismatch` is checked before distance so a photo of the wrong street never reaches the
 * radius question at all.
 */
export function exifHouseNumberProposal(input: ExifHouseNumberInput): ExifHouseNumberDecision {
  if (input.radiusMeters == null) {
    return { propose: false, reason: 'radius_not_configured' };
  }
  if (!input.establishedStreet?.trim()) {
    return { propose: false, reason: 'no_street_established' };
  }
  if (input.establishedHouseNumber?.trim()) {
    return { propose: false, reason: 'house_number_already_known' };
  }
  if (!input.exifCoords) {
    return { propose: false, reason: 'no_exif_coordinates' };
  }
  if (!input.reverse) {
    return { propose: false, reason: 'no_reverse_result' };
  }
  if (!streetsMatch(input.establishedStreet, input.reverse.street)) {
    return { propose: false, reason: 'street_mismatch' };
  }
  if (!input.reverse.houseNumber?.trim()) {
    return { propose: false, reason: 'reverse_has_no_house_number' };
  }
  if (!input.streetPosition) {
    // Nothing to measure against. Treated as out of radius rather than as a pass: an unmeasurable
    // distance is not a short one.
    return { propose: false, reason: 'outside_radius' };
  }

  const distanceMeters = haversineMetersBetween(input.exifCoords, input.streetPosition);
  if (distanceMeters > input.radiusMeters) {
    return { propose: false, reason: 'outside_radius' };
  }

  return {
    propose: true,
    houseNumber: input.reverse.houseNumber.trim(),
    origin: 'derived',
    rule: EXIF_TO_HOUSE_NUMBER_RULE,
    distanceMeters,
  };
}

export interface ExifHouseNumberProposalKeyInput {
  street: string;
  houseNumber: string;
  /** Whatever already distinguishes one locality from another in the grouping key. */
  areaKey: string;
}

/**
 * One key per **proposed address**, which is what makes this "ask once, not once per file".
 *
 * A per-file confirmation would be the worst possible shape: the highest-volume question in the
 * system, since every photo has EXIF, and the least answerable, since nobody can verify a house
 * number from a thumbnail. Files sharing this key merge into one question through the existing
 * group merge — the mechanism that already collapsed 549 files into a single tray.
 *
 * The street is folded for the same reason it is folded when comparing: spelling twins are one
 * place and must not produce two questions.
 */
export function exifHouseNumberProposalKey(input: ExifHouseNumberProposalKeyInput): string {
  const street = normalizeStreetForGroupingKey(input.street);
  const houseNumber = input.houseNumber.trim().toLowerCase();
  return `${EXIF_TO_HOUSE_NUMBER_RULE}|${input.areaKey}|${street}|${houseNumber}`;
}
