import {
  computeAnchorPlacementForElement,
  getPlacementBounds,
} from './dropdown-anchor-placement';

describe('dropdown-anchor-placement', () => {
  it('flips above when panel does not fit below in bounds', () => {
    const anchor = document.createElement('div');
    const panel = document.createElement('div');
    document.body.append(anchor, panel);

    anchor.getBoundingClientRect = () =>
      ({
        top: 400,
        bottom: 430,
        left: 100,
        right: 300,
        width: 200,
        height: 30,
      }) as DOMRect;

    panel.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 200,
        height: 200,
      }) as DOMRect;
    Object.defineProperty(panel, 'offsetWidth', { value: 200 });
    Object.defineProperty(panel, 'offsetHeight', { value: 200 });

    const clip = document.createElement('div');
    clip.style.overflow = 'auto';
    clip.style.height = '500px';
    clip.append(anchor);
    document.body.append(clip);

    clip.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 450,
        left: 0,
        right: 400,
        width: 400,
        height: 450,
      }) as DOMRect;
    Object.defineProperty(clip, 'scrollHeight', { value: 800 });
    Object.defineProperty(clip, 'clientHeight', { value: 450 });

    const result = computeAnchorPlacementForElement(anchor, panel, 'start', 4, 8);
    expect(result.openBelow).toBe(false);
    expect(result.top).toBeLessThan(400);

    clip.remove();
    anchor.remove();
    panel.remove();
  });
});
