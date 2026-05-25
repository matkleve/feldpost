import { describe, expect, it } from 'vitest';
import {
  resolveInitialGridAspectRatioCss,
  shouldIgnoreGridAspectHandoffReset,
} from './media-item-grid-aspect.helpers';

describe('resolveInitialGridAspectRatioCss', () => {
  it('prefers session cached ratio', () => {
    expect(resolveInitialGridAspectRatioCss(1.5, null, true)).toBe('1.5');
  });

  it('uses registry hint for non-native slots when cache is empty', () => {
    expect(resolveInitialGridAspectRatioCss(null, 1.777, false)).toBe('1.777');
  });

  it('defaults to square when native and no cache', () => {
    expect(resolveInitialGridAspectRatioCss(null, 1.777, true)).toBe('1');
  });
});

describe('shouldIgnoreGridAspectHandoffReset', () => {
  it('ignores handoff 1 when cache has portrait ratio', () => {
    expect(shouldIgnoreGridAspectHandoffReset(1, 1.5)).toBe(true);
  });

  it('allows handoff 1 on first paint when cache is empty', () => {
    expect(shouldIgnoreGridAspectHandoffReset(1, null)).toBe(false);
  });
});
