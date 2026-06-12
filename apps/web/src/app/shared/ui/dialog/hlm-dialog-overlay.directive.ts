// TODO(spartan-v4): Replace with @spartan-ng/ui-dialog-helm when Tailwind v4 peers allow.
// @see docs/MIGRATION_PLAN.md

import { DestroyRef, Directive, inject } from '@angular/core';
import { BrnDialog } from '@spartan-ng/brain/dialog';
import { dialogOverlayVariants } from './dialog-variants';

/**
 * Pushes overlay/backdrop classes onto the active BrnDialog (CDK backdrop).
 * Host is a wiring node only; pair with an ancestor `brnDialog`.
 */
@Directive({
  selector: '[hlmDialogOverlay]',
  standalone: true,
})
export class HlmDialogOverlayDirective {
  private readonly _brnDialog = inject(BrnDialog);
  private readonly _destroyRef = inject(DestroyRef);

  constructor() {
    // Run synchronously so BrnDialog.open() (afterNextRender) reads backdrop classes.
    this._brnDialog.setOverlayClass(dialogOverlayVariants());
    this._destroyRef.onDestroy(() => {
      this._brnDialog.setOverlayClass('');
    });
  }
}
