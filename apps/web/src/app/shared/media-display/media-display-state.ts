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
  loading: ['warm-preview', 'loaded', 'icon-only', 'error', 'no-media'],
  'warm-preview': ['loaded', 'error', 'no-media'],
  loaded: ['loading', 'icon-only', 'error', 'no-media'],
  'icon-only': ['loading', 'no-media'],
  error: ['loading', 'no-media'],
  'no-media': ['loading', 'error'],
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
