import { Component, computed, input, output } from '@angular/core';
import { BrnDialogImports, type BrnDialogState } from '@spartan-ng/brain/dialog';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HLM_DIALOG_IMPORTS } from '../ui/dialog';

/** Panel width. `md` carries a sentence of body copy; `sm` is a short yes/no. */
export type ConfirmDialogSize = 'sm' | 'md';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS, ...HLM_BUTTON_IMPORTS],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');
  readonly cancelLabel = input('Cancel');
  readonly danger = input(true);
  /** Parent has an action in flight: both buttons disable and the dialog cannot self-close. */
  readonly busy = input(false);
  readonly size = input<ConfirmDialogSize>('sm');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  protected readonly contentClass = computed(() =>
    this.size() === 'md' ? 'max-w-[26rem]' : 'max-w-[20rem]',
  );

  /**
   * Escape, or any other close BrnDialog performs on its own, reads as a cancel — a
   * dismissal the parent never hears about would strand its `@if` signal, leaving a truthy
   * signal with no overlay and a trigger that can never reopen (issue #254).
   *
   * Bound to `stateChanged` rather than `closed`: `close()` flips state synchronously but
   * defers the CDK teardown by `closeDelay` (100ms), and the parent must not spend those
   * 100ms believing a dialog is open that the user has already dismissed.
   *
   * No "one outcome per mounting" latch: the buttons carry no `brnDialogClose`, so a press
   * never closes the dialog and cannot race this. The parent decides when to unmount, and
   * while it stays mounted — as the projects page does after a failed delete — every press
   * must keep reporting, or the user is left with a live modal whose buttons do nothing.
   */
  protected onDialogState(state: BrnDialogState): void {
    if (state !== 'closed') return;
    this.cancelled.emit();
  }
}
