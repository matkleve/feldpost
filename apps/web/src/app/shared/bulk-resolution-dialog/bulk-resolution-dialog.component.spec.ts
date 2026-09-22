/**
 * Bulk-resolution confirmation dialog (#219, STUDY-006 Phase 5.4).
 *
 * R7: nothing is written until the user confirms an exact count and address. This component is the
 * only thing standing between `plan()` and `run()`, so its job is to make the plan legible —
 * including the part that is easy to swallow, which is what the run will *not* do.
 *
 * @see docs/specs/component/bulk-resolution-dialog/bulk-resolution-dialog.md
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

import { describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BulkResolutionDialogComponent } from './bulk-resolution-dialog.component';
import type { BulkResolutionPlan } from '../../core/media-location-bulk/bulk-resolution.planner';
import type { BulkResolutionReport } from '../../core/media-location-bulk/bulk-resolution.runner';

/** Two Viennese addresses over 254 files — one geocode each, which is R5 made visible. */
const PLAN: BulkResolutionPlan = {
  groups: [
    {
      addressKey: 'at|wien|1010|thalistraße|4',
      addressLabel: 'Thalistraße 4, 1010 Wien',
      mediaIds: Array.from({ length: 250 }, (_, i) => `m-${i}`),
      coords: { lat: 48.2082, lng: 16.3738 },
    },
    {
      addressKey: 'at|wien|1070|kirchengasse|11',
      addressLabel: 'Kirchengasse 11, 1070 Wien',
      mediaIds: ['m-250', 'm-251', 'm-252', 'm-253'],
      coords: { lat: 48.2006, lng: 16.3494 },
    },
  ],
  skipped: [
    { mediaId: 'm-900', reason: 'no_address_in_source' },
    { mediaId: 'm-901', reason: 'no_address_in_source' },
    { mediaId: 'm-902', reason: 'already_resolved' },
  ],
  eligibleCount: 254,
  geocodeCount: 2,
};

/** What this project's own database would produce today: five PDFs, no path, no EXIF. */
const NOTHING_TO_DO: BulkResolutionPlan = {
  groups: [],
  skipped: [
    { mediaId: 'p-1', reason: 'no_address_in_source' },
    { mediaId: 'p-2', reason: 'no_address_in_source' },
    { mediaId: 'p-3', reason: 'no_address_in_source' },
    { mediaId: 'p-4', reason: 'no_address_in_source' },
    { mediaId: 'p-5', reason: 'no_address_in_source' },
  ],
  eligibleCount: 0,
  geocodeCount: 0,
};

const REPORT: BulkResolutionReport = {
  outcomes: [],
  resolved: 251,
  skipped: 0,
  failed: 3,
  geocodesPerformed: 2,
  completed: true,
};

function setup(): ComponentFixture<BulkResolutionDialogComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [BulkResolutionDialogComponent] });
  const fixture = TestBed.createComponent(BulkResolutionDialogComponent);
  fixture.componentRef.setInput('plan', PLAN);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<BulkResolutionDialogComponent>): string {
  return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function query(
  fixture: ComponentFixture<BulkResolutionDialogComponent>,
  selector: string,
): HTMLElement | null {
  return document.body.querySelector(selector);
}

describe('BulkResolutionDialogComponent — confirming', () => {
  it('states the exact count and the exact addresses before anything is written (R7)', () => {
    const fixture = setup();

    const body = text(fixture);
    expect(body).toContain('254');
    expect(body).toContain('Thalistraße 4, 1010 Wien');
    expect(body).toContain('Kirchengasse 11, 1070 Wien');
  });

  it('states the geocode cost separately, so R5 is visible rather than implied', () => {
    const fixture = setup();

    expect(query(fixture, '[data-role="geocode-count"]')?.textContent).toContain('2');
  });

  it('shows how many files each address covers — 250 files is one address, not 250', () => {
    const fixture = setup();

    const groups = document.body.querySelectorAll('[data-role="plan-group"]');
    expect(groups).toHaveLength(2);
    expect(groups[0].textContent).toContain('250');
  });

  it('shows skipped items with their reasons, never swallowed', () => {
    const fixture = setup();

    const skipped = query(fixture, '[data-role="plan-skipped"]');
    expect(skipped).not.toBeNull();
    expect(skipped?.textContent).toContain('2');
    expect(skipped?.textContent).toContain('1');
  });

});

describe('BulkResolutionDialogComponent — choices and refusals', () => {
  it('says plainly when the run would write nothing, instead of offering an empty Apply', () => {
    // This project's own database today: 5 PDFs, relative_path NULL, no EXIF. Without this the
    // user clicks Apply, nothing happens, and the dialog looks broken rather than correct.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [BulkResolutionDialogComponent] });
    const fixture = TestBed.createComponent(BulkResolutionDialogComponent);
    fixture.componentRef.setInput('plan', NOTHING_TO_DO);
    fixture.detectChanges();

    expect(query(fixture, '[data-state="nothing-to-do"]')).not.toBeNull();
    expect(query(fixture, '[data-role="confirm"]')).toBeNull();
  });

  it('leaves overwrite off — B3 is an explicit choice, never a default', () => {
    const fixture = setup();

    const toggle = query(fixture, '[data-role="overwrite"]') as HTMLInputElement | null;
    expect(toggle).not.toBeNull();
    expect(toggle?.checked).toBe(false);
  });

  it('hides overwrite when no item was skipped for already having a location', () => {
    // The deferred-backlog figures select on isBulkEligibleStatus, so `already_resolved` cannot
    // occur there. A checkbox that changes nothing either way is worse than no checkbox.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [BulkResolutionDialogComponent] });
    const fixture = TestBed.createComponent(BulkResolutionDialogComponent);
    fixture.componentRef.setInput('plan', {
      ...PLAN,
      skipped: [{ mediaId: 'm-900', reason: 'no_address_in_source' as const }],
    });
    fixture.detectChanges();

    expect(query(fixture, '[data-role="overwrite"]')).toBeNull();
    expect(query(fixture, '[data-role="plan-skipped"]')).not.toBeNull();
  });

});

describe('BulkResolutionDialogComponent — emitting', () => {
  it('emits nothing on cancel — cancel writes nothing', () => {
    const fixture = setup();
    const confirmed: number[] = [];
    const cancelled: number[] = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmed.push(1));
    fixture.componentInstance.cancelled.subscribe(() => cancelled.push(1));

    (query(fixture, '[data-role="cancel"]') as HTMLButtonElement).click();

    expect(cancelled).toHaveLength(1);
    expect(confirmed).toHaveLength(0);
  });

  it('emits confirmed once when the user applies', () => {
    const fixture = setup();
    const confirmed: number[] = [];
    fixture.componentInstance.confirmed.subscribe(() => confirmed.push(1));

    (query(fixture, '[data-role="confirm"]') as HTMLButtonElement).click();

    expect(confirmed).toHaveLength(1);
  });
});

describe('BulkResolutionDialogComponent — running and done', () => {
  it('reports progress as done-of-total while the run is in flight', () => {
    const fixture = setup();
    fixture.componentRef.setInput('running', true);
    fixture.componentRef.setInput('progress', { done: 120, total: 254 });
    fixture.detectChanges();

    const progress = query(fixture, '[data-state="running"]');
    expect(progress?.textContent).toContain('120');
    expect(progress?.textContent).toContain('254');
  });

  it('cannot be confirmed twice — Apply is gone once the run starts', () => {
    const fixture = setup();
    fixture.componentRef.setInput('running', true);
    fixture.detectChanges();

    expect(query(fixture, '[data-role="confirm"]')).toBeNull();
  });

  it('reports failures rather than claiming the run succeeded', () => {
    const fixture = setup();
    fixture.componentRef.setInput('report', REPORT);
    fixture.detectChanges();

    const done = query(fixture, '[data-state="done"]');
    expect(done?.textContent).toContain('251');
    expect(done?.textContent).toContain('3');
  });

  it('says a run was cut short instead of presenting a partial report as complete', () => {
    const fixture = setup();
    fixture.componentRef.setInput('report', { ...REPORT, completed: false });
    fixture.detectChanges();

    expect(query(fixture, '[data-state="done"]')?.getAttribute('data-completed')).toBe('false');
  });
});
