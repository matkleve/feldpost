import { describe, expect, it } from 'vitest';
import { transitionMediaDisplayState } from './media-display-state';

describe('transitionMediaDisplayState', () => {
  it('allows media-ready → content-visible for warm revisit skip-fade', () => {
    expect(transitionMediaDisplayState('media-ready', 'content-visible')).toBe('content-visible');
  });

  it('forbids loading-surface-visible → content-visible shortcut', () => {
    expect(transitionMediaDisplayState('loading-surface-visible', 'content-visible')).toBe(
      'loading-surface-visible',
    );
  });
});
