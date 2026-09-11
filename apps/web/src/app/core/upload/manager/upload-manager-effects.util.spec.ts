import { describe, expect, it, vi } from 'vitest';
import { registerUploadManagerEffects } from './upload-manager-effects.util';
import type { UploadManagerEffectsDeps } from './upload-manager-effects.util';

/**
 * `createEffect` in production is Angular's `effect()`, which re-runs its
 * runner whenever a signal it reads changes. This stand-in runs the runner
 * once immediately (capturing the initial state) and exposes `rerun()` so
 * tests can simulate a signal change without pulling in Angular's injection
 * context.
 */
function fakeEffect() {
  const runners: Array<() => void> = [];
  return {
    createEffect: (runner: () => void) => {
      runners.push(runner);
      runner();
    },
    rerun: () => runners.forEach((runner) => runner()),
  };
}

function buildDeps(overrides: Partial<UploadManagerEffectsDeps<{ id: string }>> = {}) {
  return {
    createEffect: vi.fn<(runner: () => void) => void>(),
    getUser: () => ({ id: 'user-1' }),
    hasRunning: () => false,
    cancelAllActive: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    isBusy: () => false,
    addBeforeUnloadListener: vi.fn<(handler: (event: BeforeUnloadEvent) => void) => void>(),
    removeBeforeUnloadListener: vi.fn<(handler: (event: BeforeUnloadEvent) => void) => void>(),
    beforeUnloadHandler: () => {},
    ...overrides,
  };
}

describe('registerUploadManagerEffects', () => {
  // @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 4 T3
  it('adds the beforeunload listener once isBusy() becomes true', () => {
    const { createEffect, rerun } = fakeEffect();
    let busy = false;
    const deps = buildDeps({ createEffect, isBusy: () => busy });

    // Not busy yet at registration time.
    expect(deps.addBeforeUnloadListener).not.toHaveBeenCalled();

    registerUploadManagerEffects(deps);
    expect(deps.addBeforeUnloadListener).not.toHaveBeenCalled();
    expect(deps.removeBeforeUnloadListener).toHaveBeenCalledWith(deps.beforeUnloadHandler);

    busy = true;
    rerun();

    expect(deps.addBeforeUnloadListener).toHaveBeenCalledWith(deps.beforeUnloadHandler);
  });

  it('removes the beforeunload listener once isBusy() returns to false', () => {
    const { createEffect, rerun } = fakeEffect();
    let busy = true;
    const deps = buildDeps({ createEffect, isBusy: () => busy });

    registerUploadManagerEffects(deps);
    expect(deps.addBeforeUnloadListener).toHaveBeenCalledOnce();

    busy = false;
    rerun();

    expect(deps.removeBeforeUnloadListener).toHaveBeenCalledWith(deps.beforeUnloadHandler);
  });

  it('cancels active uploads when the user signs out while jobs are running', () => {
    const { createEffect } = fakeEffect();
    const deps = buildDeps({
      createEffect,
      getUser: () => null,
      hasRunning: () => true,
    });

    registerUploadManagerEffects(deps);

    expect(deps.cancelAllActive).toHaveBeenCalledOnce();
  });

  it('does not cancel uploads when signed out with no active jobs', () => {
    const { createEffect } = fakeEffect();
    const deps = buildDeps({
      createEffect,
      getUser: () => null,
      hasRunning: () => false,
    });

    registerUploadManagerEffects(deps);

    expect(deps.cancelAllActive).not.toHaveBeenCalled();
  });

  it('does not cancel uploads while a user is still signed in', () => {
    const { createEffect } = fakeEffect();
    const deps = buildDeps({
      createEffect,
      getUser: () => ({ id: 'user-1' }),
      hasRunning: () => true,
    });

    registerUploadManagerEffects(deps);

    expect(deps.cancelAllActive).not.toHaveBeenCalled();
  });
});
