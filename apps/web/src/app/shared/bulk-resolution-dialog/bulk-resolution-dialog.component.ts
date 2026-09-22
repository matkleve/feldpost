/**
 * Bulk-resolution confirmation (#219, STUDY-006 Phase 5.4).
 *
 * The engine has been built and unreachable since 5.3: `BulkResolutionService` splits `plan()` from
 * `run()` precisely so a human sees an exact count and an exact address before anything is written
 * (R7), and nothing rendered the plan. This is that surface, and nothing else — it holds no state
 * about the run, calls no service, and writes nothing. The caller owns `plan()`/`run()`; this turns
 * their output into something a person can refuse.
 *
 * **Why "nothing to do" is its own stage.** A plan with `eligibleCount: 0` is a normal, correct
 * outcome — this project's own database produces exactly that today: five PDFs whose
 * `relative_path` is NULL and which carry no EXIF, so no source yields an address and the planner
 * skips all five as `no_address_in_source` (verified against the project database 2026-09-20).
 * Offering Apply there would write nothing and read as a broken button; saying so reads as correct.
 *
 * @see docs/specs/component/bulk-resolution-dialog/bulk-resolution-dialog.md
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { I18nService } from '../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';
import type {
  BulkResolutionPlan,
  BulkSkipReason,
} from '../../core/media-location-bulk/bulk-resolution.planner';
import type { BulkResolutionReport } from '../../core/media-location-bulk/bulk-resolution.runner';

/** Stable states. `confirming` and `nothing-to-do` are pre-write; `done` is terminal. */
export type BulkResolutionDialogStage = 'confirming' | 'nothing-to-do' | 'running' | 'done';

export interface BulkResolutionSkipSummary {
  reason: BulkSkipReason;
  count: number;
}

@Component({
  selector: 'app-bulk-resolution-dialog',
  standalone: true,
  imports: [NgTemplateOutlet, ...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...HLM_BUTTON_IMPORTS],
  templateUrl: './bulk-resolution-dialog.component.html',
  styleUrl: './bulk-resolution-dialog.component.scss',
})
export class BulkResolutionDialogComponent {
  private readonly i18n = inject(I18nService);
  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);

  readonly plan = input<BulkResolutionPlan | null>(null);
  readonly running = input(false);
  readonly progress = input<{ done: number; total: number } | null>(null);
  readonly report = input<BulkResolutionReport | null>(null);
  /** B3. Off unless the caller says otherwise; the template never defaults it on. */
  readonly overwriteExisting = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly overwriteToggled = output<boolean>();

  /**
   * One stable state at a time (FSM contract). Order is the run's own order, so a late `report`
   * always wins over a stale `running` and the dialog cannot show two stages at once.
   */
  readonly stage = computed<BulkResolutionDialogStage>(() => {
    if (this.report()) {
      return 'done';
    }
    if (this.running()) {
      return 'running';
    }
    return (this.plan()?.eligibleCount ?? 0) > 0 ? 'confirming' : 'nothing-to-do';
  });

  /** Skipped items collapsed to one row per reason — 4 000 ids is not a list anyone reads. */
  readonly skippedByReason = computed<BulkResolutionSkipSummary[]>(() => {
    const counts = new Map<BulkSkipReason, number>();
    for (const item of this.plan()?.skipped ?? []) {
      counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
    }
    return [...counts.entries()].map(([reason, count]) => ({ reason, count }));
  });

  /**
   * Offer B3 only where it would change something.
   *
   * Overwriting applies to items the planner skipped as `already_resolved`. A caller whose set is
   * bulk-eligible by construction — the deferred-backlog figures, which select on
   * `isBulkEligibleStatus` — can never produce one, so the toggle there would be a control that
   * does nothing whichever way it is set. Deriving it from the plan means no caller has to know
   * that; the checkbox appears exactly when it has an effect.
   */
  readonly overwriteWouldChangeSomething = computed(
    () =>
      this.overwriteExisting() ||
      this.skippedByReason().some((summary) => summary.reason === 'already_resolved'),
  );

  readonly titleText = (): string =>
    this.t('bulk.resolution.dialog.title', 'Apply addresses in bulk');

  readonly dismissLabel = (): string =>
    this.stage() === 'confirming'
      ? this.t('bulk.resolution.dialog.cancel', 'Cancel')
      : this.t('bulk.resolution.dialog.close', 'Close');

  readonly overwriteLabel = (): string =>
    this.t(
      'bulk.resolution.dialog.overwrite',
      'Also overwrite items that already have a location',
    );

  readonly nothingToDoLabel = (): string =>
    this.t(
      'bulk.resolution.dialog.nothingToDo',
      'Nothing here can be given an address automatically.',
    );

  readonly startingLabel = (): string => this.t('bulk.resolution.dialog.starting', 'Starting…');

  readonly incompleteLabel = (): string =>
    this.t(
      'bulk.resolution.dialog.incomplete',
      'The run was stopped before every item was written.',
    );

  applyCountLabel(count: number): string {
    return this.t('bulk.resolution.dialog.applyCount', '{count} items will get an address').replace(
      '{count}',
      `${count}`,
    );
  }

  geocodeCountLabel(count: number): string {
    return this.t('bulk.resolution.dialog.geocodeCount', 'Address lookups: {count}').replace(
      '{count}',
      `${count}`,
    );
  }

  groupCountLabel(count: number): string {
    return this.t('bulk.resolution.dialog.groupCount', '{count} files').replace(
      '{count}',
      `${count}`,
    );
  }

  /** Each reason says what was *not* done and why, in the user's terms rather than the enum's. */
  skipReasonLabel(summary: BulkResolutionSkipSummary): string {
    const template =
      summary.reason === 'already_resolved'
        ? this.t(
            'bulk.resolution.dialog.skip.alreadyResolved',
            '{count} skipped: they already have a location',
          )
        : this.t(
            'bulk.resolution.dialog.skip.noAddressInSource',
            '{count} skipped: no address in the folder path or file name',
          );
    return template.replace('{count}', `${summary.count}`);
  }

  progressLabel(done: number, total: number): string {
    return this.t('bulk.resolution.dialog.progress', 'Writing {done} of {total}…')
      .replace('{done}', `${done}`)
      .replace('{total}', `${total}`);
  }

  reportLabel(report: BulkResolutionReport): string {
    return this.t(
      'bulk.resolution.dialog.report',
      '{resolved} written, {failed} failed, {geocodes} address lookups',
    )
      .replace('{resolved}', `${report.resolved}`)
      .replace('{failed}', `${report.failed}`)
      .replace('{geocodes}', `${report.geocodesPerformed}`);
  }

  onOverwriteChange(event: Event): void {
    this.overwriteToggled.emit((event.target as HTMLInputElement).checked);
  }
}
