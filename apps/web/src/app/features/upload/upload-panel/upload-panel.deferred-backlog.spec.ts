/**
 * STUDY-009 idea C (#232) — the deferred backlog, shown where it outlives the upload session.
 *
 * The archive-import figures next to this block are session state: they count `UploadJob`s in the
 * current batch and vanish with it. These figures come from the database, so they are still there
 * tomorrow, in a tab opened with no upload running at all. That difference is the whole issue.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 */

import { describe, expect, it } from 'vitest';
import { setupUploadPanel } from './upload-panel.spec-setup';

/** 5 000 photos: 4 588 located, 254 with an address but no pin, 158 with nothing. */
const LIBRARY = {
  all: 5000,
  byStatus: { resolved: 4500, gps: 88, partial: 254, pending: 120, unresolvable: 38 },
};

function backlogText(fixture: { nativeElement: HTMLElement }): string {
  const block = fixture.nativeElement.querySelector('[data-state="deferred-backlog"]');
  return block?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('upload panel — deferred location backlog', () => {
  it('shows the two figures separately, never blended into one', async () => {
    const { fixture } = await setupUploadPanel({ deferredCounts: LIBRARY });

    await fixture.whenStable();
    fixture.detectChanges();

    const text = backlogText(fixture);
    expect(text).toContain('158');
    expect(text).toContain('254');
    // "412 items need attention" is the number this block exists not to show.
    expect(text).not.toContain('412');
  });

  it('renders nothing when the backlog is empty — no zero-state noise in the intake area', async () => {
    const { fixture } = await setupUploadPanel({
      deferredCounts: { all: 100, byStatus: { resolved: 100 } },
    });

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-state="deferred-backlog"]')).toBeNull();
  });

  it('shows the block with one figure at zero rather than hiding half the backlog', async () => {
    const { fixture } = await setupUploadPanel({
      deferredCounts: { all: 100, byStatus: { resolved: 90, partial: 10 } },
    });

    await fixture.whenStable();
    fixture.detectChanges();

    const text = backlogText(fixture);
    expect(text).toContain('10');
    expect(text).toContain('0');
  });

  it('counts once on open, not once per change-detection pass', async () => {
    const { fixture, fakeDeferredCounts } = await setupUploadPanel({ deferredCounts: LIBRARY });

    await fixture.whenStable();
    fixture.detectChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fakeDeferredCounts.countAll).toHaveBeenCalledTimes(1);
  });

  it('announces the figures politely — they change under the user, not in response to them', async () => {
    const { fixture } = await setupUploadPanel({ deferredCounts: LIBRARY });

    await fixture.whenStable();
    fixture.detectChanges();

    const block = fixture.nativeElement.querySelector('[data-state="deferred-backlog"]');
    expect(block?.getAttribute('aria-live')).toBe('polite');
    expect(block?.getAttribute('role')).toBe('status');
  });
});
