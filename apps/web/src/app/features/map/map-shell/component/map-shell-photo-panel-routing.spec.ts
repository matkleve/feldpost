import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { featureFlagStorageKey } from '../../../../core/feature-flags/adapters/feature-flags-storage.adapter';
import { ShellLayoutService } from '../../../../core/shell-layout/shell-layout.service';
import { MapShellState } from './map-shell.state';

describe('MapShellState photo panel routing', () => {
  const key = featureFlagStorageKey('shellGridLayout');

  beforeEach(() => {
    localStorage.removeItem(key);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem(key);
  });

  it('opens the workspace pane signal when the grid shell is off', () => {
    const state = TestBed.inject(MapShellState);
    const shell = TestBed.inject(ShellLayoutService);
    state.setPhotoPanelOpen(true);
    expect(state.photoPanelOpen()).toBe(true);
    expect(shell.isOpen('download')).toBe(false);
  });

  it('opens the download panel and leaves the workspace pane closed when the grid shell is on', () => {
    localStorage.setItem(key, 'true');
    const state = TestBed.inject(MapShellState);
    const shell = TestBed.inject(ShellLayoutService);
    state.setPhotoPanelOpen(true);
    expect(state.photoPanelOpen()).toBe(false);
    expect(shell.isOpen('download')).toBe(true);
    state.setPhotoPanelOpen(false);
    expect(state.photoPanelOpen()).toBe(false);
    expect(shell.isOpen('download')).toBe(false);
  });
});
