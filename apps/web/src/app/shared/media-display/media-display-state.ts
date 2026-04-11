export type MediaDisplayState =
  | 'idle'
  | 'loading-surface-visible'
  | 'ratio-known-contain'
  | 'media-ready'
  | 'content-fade-in'
  | 'content-visible'
  | 'icon-only'
  | 'error'
  | 'no-media';

export const MEDIA_DISPLAY_TRANSITIONS: Record<MediaDisplayState, MediaDisplayState[]> = {
  idle: ['loading-surface-visible'],
  'loading-surface-visible': [
    'ratio-known-contain',
    'media-ready',
    'icon-only',
    'error',
    'no-media',
  ],
  'ratio-known-contain': ['media-ready', 'error', 'no-media'],
  'media-ready': ['content-fade-in', 'icon-only', 'error', 'no-media'],
  'content-fade-in': ['content-visible', 'icon-only', 'error', 'no-media'],
  'content-visible': ['loading-surface-visible', 'icon-only', 'error', 'no-media'],
  'icon-only': ['loading-surface-visible', 'no-media'],
  error: ['loading-surface-visible', 'no-media'],
  'no-media': ['loading-surface-visible', 'error'],
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
