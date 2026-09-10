import { describe, expect, it } from 'vitest';
import {
  canTransitionUploadResolverTrayState,
  deriveUploadResolverTrayVisualState,
  liveTrayJobIds,
} from './upload-resolver-tray-state';
import type { TrayResolveItem } from '../../../core/upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.types';

describe('upload-resolver-tray-state', () => {
  it('derives blocked when item status is blocked', () => {
    const item = { answerKind: 'single_choice' } as TrayResolveItem;
    expect(deriveUploadResolverTrayVisualState(item, 'blocked')).toBe('blocked');
  });

  it('derives house_step for step 1b', () => {
    const item = {
      answerKind: 'single_choice',
      trayStepLabel: '1b',
    } as TrayResolveItem;
    expect(deriveUploadResolverTrayVisualState(item, 'ready')).toBe('house_step');
  });

  it('allows transition from choice_list to house_step', () => {
    expect(canTransitionUploadResolverTrayState('choice_list', 'house_step')).toBe(true);
  });

  it('prunes vanished tray job ids', () => {
    const live = liveTrayJobIds(['a', 'b', 'c'], (id) => (id === 'b' ? undefined : { id }));
    expect(live).toEqual(['a', 'c']);
  });
});
