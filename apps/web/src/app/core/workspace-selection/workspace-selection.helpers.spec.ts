import {
  isAdditivePointerSelection,
  resolveRangeAnchorId,
  sliceIdRangeInOrder,
} from './workspace-selection.helpers';

describe('workspace-selection.helpers', () => {
  it('detects additive pointer modifiers', () => {
    expect(isAdditivePointerSelection({ shiftKey: false, ctrlKey: true, metaKey: false })).toBe(
      true,
    );
    expect(isAdditivePointerSelection({ shiftKey: false, ctrlKey: false, metaKey: true })).toBe(
      true,
    );
    expect(isAdditivePointerSelection({ shiftKey: true, ctrlKey: false, metaKey: false })).toBe(
      false,
    );
  });

  it('slices inclusive ranges in visible order', () => {
    expect(sliceIdRangeInOrder(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['b', 'c', 'd']);
  });

  it('resolves anchor from explicit anchor, sole selection, or target', () => {
    expect(resolveRangeAnchorId('x', new Set(), 'y')).toBe('x');
    expect(resolveRangeAnchorId(null, new Set(['only']), 'y')).toBe('only');
    expect(resolveRangeAnchorId(null, new Set(), 'y')).toBe('y');
  });
});
