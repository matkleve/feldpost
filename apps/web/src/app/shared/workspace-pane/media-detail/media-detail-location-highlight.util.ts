import type { ImageRecord } from './media-detail-view.types';

export type LocationHighlightField =
  | 'address'
  | 'street'
  | 'city'
  | 'district'
  | 'country'
  | 'coordinates';

function normLocationValue(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** Fields whose values changed between two media snapshots (for flash animation). */
export function collectLocationFieldChanges(
  before: ImageRecord,
  after: ImageRecord,
): LocationHighlightField[] {
  const changed: LocationHighlightField[] = [];

  if (normLocationValue(before.address_label) !== normLocationValue(after.address_label)) {
    changed.push('address');
  }
  if (normLocationValue(before.street) !== normLocationValue(after.street)) {
    changed.push('street');
  }
  if (normLocationValue(before.city) !== normLocationValue(after.city)) {
    changed.push('city');
  }
  if (normLocationValue(before.district) !== normLocationValue(after.district)) {
    changed.push('district');
  }
  if (normLocationValue(before.country) !== normLocationValue(after.country)) {
    changed.push('country');
  }
  if (before.latitude !== after.latitude || before.longitude !== after.longitude) {
    changed.push('coordinates');
  }

  return changed;
}
