/**
 * FSM for EXIF → location add on the Details EXIF row.
 * @see docs/specs/ui/media-detail/media-detail-inline-section.md#exif--location-fsm
 */
export type ExifLocationAddState = 'hidden' | 'idle' | 'resolving';

export const EXIF_LOCATION_ADD_TRANSITIONS: Record<
  ExifLocationAddState,
  readonly ExifLocationAddState[]
> = {
  hidden: ['idle'],
  idle: ['resolving'],
  resolving: ['idle'],
};

export function canTransitionExifLocationAdd(
  from: ExifLocationAddState,
  to: ExifLocationAddState,
): boolean {
  return EXIF_LOCATION_ADD_TRANSITIONS[from].includes(to);
}

export function goToExifLocationAdd(
  current: ExifLocationAddState,
  next: ExifLocationAddState,
): ExifLocationAddState {
  return canTransitionExifLocationAdd(current, next) ? next : current;
}
