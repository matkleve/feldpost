import { describe, expect, it } from 'vitest';
import { applySetOpen } from './shell-layout.helpers';
import type { ShellPanelRow } from './shell-layout.types';

describe('applySetOpen', () => {
  it('opens upload and help together and keeps order stable on a second open', () => {
    const upload = applySetOpen([], 'upload', true);
    const both = applySetOpen(upload, 'help', true);
    expect(both.map((panel) => panel.id)).toEqual(['upload', 'help']);
    expect(applySetOpen(both, 'upload', true)).toBe(both);
  });

  it('close on a closed id returns the same list', () => {
    const closed: readonly ShellPanelRow[] = [];
    expect(applySetOpen(closed, 'help', false)).toBe(closed);
  });

  it('closing upload leaves help in place', () => {
    const both = applySetOpen(applySetOpen([], 'upload', true), 'help', true);
    expect(applySetOpen(both, 'upload', false).map((panel) => panel.id)).toEqual(['help']);
  });

  it('keeps upload open when download opens', () => {
    const download = applySetOpen([], 'download', true);
    const both = applySetOpen(download, 'upload', true);
    expect(both.map((panel) => panel.id)).toEqual(['download', 'upload']);
    expect(both.every((panel) => panel.open)).toBe(true);
  });

  it('keeps tips open when help opens', () => {
    const tips = applySetOpen([], 'tips', true);
    const both = applySetOpen(tips, 'help', true);
    expect(both.map((panel) => panel.id)).toEqual(['tips', 'help']);
    expect(both.every((panel) => panel.open)).toBe(true);
  });
});
