import { describe, expect, it } from 'vitest';
import {
  bundleAllTerminal,
  formatBundleCarouselIndicator,
  firstActionableIndex,
  itemStatus,
} from './upload-resolver-tray-orchestrator.helpers';
import type { TrayResolveItem } from './upload-resolver-tray-orchestrator.types';

function item(partial: Partial<TrayResolveItem> & Pick<TrayResolveItem, 'id'>): TrayResolveItem {
  return {
    producerId: 'test',
    batchId: 'batch-1',
    questionKey: 'q',
    questionParams: {},
    answerKind: 'single_choice',
    options: [{ id: 'o1', label: 'A' }],
    jobIds: ['j1'],
    ...partial,
  };
}

describe('upload-resolver-tray-orchestrator.helpers', () => {
  it('itemStatus blocks dependents until parent resolved', () => {
    const parent = item({ id: 'a' });
    const child = item({ id: 'b', dependsOnItemId: 'a', trayStepLabel: '1b' });
    const resolved = new Set<string>();
    expect(itemStatus(child, resolved, new Set())).toBe('blocked');
    resolved.add('a');
    expect(itemStatus(child, resolved, new Set())).toBe('ready');
  });

  it('formatBundleCarouselIndicator uses 1A/1B labels', () => {
    expect(formatBundleCarouselIndicator(0, 3, '1a')).toBe('1A/3');
    expect(formatBundleCarouselIndicator(0, 3, '1b')).toBe('1B/3');
    expect(formatBundleCarouselIndicator(1, 3)).toBe('2/3');
  });

  it('firstActionableIndex skips blocked items', () => {
    const items = [
      item({ id: 'a', trayStepLabel: '1a' }),
      item({ id: 'b', dependsOnItemId: 'a', trayStepLabel: '1b' }),
    ];
    expect(firstActionableIndex(items, new Set(), new Set())).toBe(0);
    expect(firstActionableIndex(items, new Set(['a']), new Set())).toBe(1);
  });

  it('bundleAllTerminal when all resolved or skipped', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    expect(bundleAllTerminal(items, new Set(), new Set())).toBe(false);
    expect(bundleAllTerminal(items, new Set(['a', 'b']), new Set())).toBe(true);
  });
});
