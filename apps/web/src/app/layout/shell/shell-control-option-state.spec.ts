import { describe, expect, it } from 'vitest';
import { goToHoverLabel } from './shell-control-option-state';

describe('goToHoverLabel', () => {
  it('shows from hidden and hides from shown', () => {
    expect(goToHoverLabel('hidden', 'shown')).toBe('shown');
    expect(goToHoverLabel('shown', 'hidden')).toBe('hidden');
  });

  it('keeps the current state when the transition is not listed', () => {
    expect(goToHoverLabel('hidden', 'hidden')).toBe('hidden');
    expect(goToHoverLabel('shown', 'shown')).toBe('shown');
  });
});
