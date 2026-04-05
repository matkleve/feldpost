export type MediaDisplayState =
  | 'empty'
  | 'loading'
  | 'warm-preview'
  | 'loaded'
  | 'icon-only'
  | 'error'
  | 'no-media';

export const MEDIA_DISPLAY_TRANSITIONS: Record<MediaDisplayState, MediaDisplayState[]> = {
  empty: ['loading', 'no-media'],
  loading: ['empty', 'warm-preview', 'loaded', 'icon-only', 'error', 'no-media'],
  'warm-preview': ['empty', 'loaded', 'error', 'no-media'],
  loaded: ['empty', 'loading', 'icon-only', 'error', 'no-media'],
  'icon-only': ['empty', 'loading', 'no-media'],
  error: ['empty', 'loading', 'no-media'],
  'no-media': ['empty', 'loading', 'error'],
};

export function transitionMediaDisplayState(
  current: MediaDisplayState,
  next: MediaDisplayState,
): MediaDisplayState {
  if (MEDIA_DISPLAY_TRANSITIONS[current].includes(next)) {
    return next;
  }
  return current;
}
