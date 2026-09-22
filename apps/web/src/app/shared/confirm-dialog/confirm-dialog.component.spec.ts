import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnDialog } from '@spartan-ng/brain/dialog';
import { ConfirmDialogComponent } from './confirm-dialog.component';

// Contract under test: docs/specs/component/confirm-dialog/confirm-dialog.md § Actions
// Issue #254 — a dismissal that is not a button press must still reach the parent.

@Component({
  standalone: true,
  imports: [ConfirmDialogComponent],
  template: `
    @if (open()) {
      <app-confirm-dialog
        [title]="'Delete archived project?'"
        [message]="'This cannot be undone.'"
        [busy]="busy()"
        (confirmed)="onConfirmed()"
        (cancelled)="onCancelled()"
      />
    }
  `,
})
class ConfirmDialogHostComponent {
  readonly open = signal(true);
  readonly busy = signal(false);
  readonly events: string[] = [];

  // Deliberately stays mounted after an outcome, the way a parent with an async confirm
  // does (projects page: `busy` across the await). That keeps the dialog alive so a later
  // self-close can be observed — an unmounting parent could not emit twice regardless.
  onConfirmed(): void {
    this.events.push('confirmed');
  }

  onCancelled(): void {
    this.events.push('cancelled');
  }
}

async function mountHost() {
  const fixture = TestBed.createComponent(ConfirmDialogHostComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** The `brnDialog` sits on an `ng-container`, so it is a DebugNode and not a DebugElement. */
function brnDialogOf(fixture: { debugElement: unknown }): BrnDialog {
  const nodes = (
    fixture.debugElement as { queryAllNodes(p: unknown): { injector: { get(t: unknown): BrnDialog } }[] }
  ).queryAllNodes(By.directive(BrnDialog));
  return nodes[0].injector.get(BrnDialog);
}

const confirmButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('.dialog__confirm');
const cancelButton = (): HTMLButtonElement | null =>
  document.querySelector<HTMLButtonElement>('.dialog__cancel');

describe('ConfirmDialogComponent — dismissal reaches the parent', () => {
  it('emits cancelled when the dialog closes itself (the Escape path)', async () => {
    const fixture = await mountHost();

    // BrnDialog closes on Escape via `keydownEvents` because `disableClose` defaults to
    // false; this is the same `close()` that key handler calls.
    brnDialogOf(fixture).close();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.events).toEqual(['cancelled']);
  });

  it('does not invent a cancel when the parent unmounts after a confirm', async () => {
    const fixture = await mountHost();
    // Mirrors every success path: the parent tears the dialog down itself.
    confirmButton()?.click();
    fixture.detectChanges();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.events).toEqual(['confirmed']);
  });

  it('emits cancelled once when Cancel is pressed', async () => {
    const fixture = await mountHost();

    cancelButton()?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.events).toEqual(['cancelled']);
  });
});

describe('ConfirmDialogComponent — a parent may hold it open to retry', () => {
  it('keeps reporting while a parent holds it open after a failed confirm', async () => {
    // The projects page returns early from confirmPendingAction() when the delete fails,
    // leaving this dialog mounted with its buttons re-enabled. Retry and cancel must both
    // still reach it — a latched "one outcome per mounting" would trap the user here.
    const fixture = await mountHost();

    confirmButton()?.click();
    fixture.detectChanges();
    confirmButton()?.click();
    fixture.detectChanges();
    cancelButton()?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.events).toEqual(['confirmed', 'confirmed', 'cancelled']);
  });

  it('still reports Escape after a failed confirm left it open', async () => {
    const fixture = await mountHost();

    confirmButton()?.click();
    fixture.detectChanges();
    brnDialogOf(fixture).close();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.events).toEqual(['confirmed', 'cancelled']);
  });
});

describe('ConfirmDialogComponent — busy', () => {
  it('disables both buttons while the parent runs an async confirm', async () => {
    const fixture = await mountHost();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    expect(confirmButton()?.disabled).toBe(true);
    expect(cancelButton()?.disabled).toBe(true);
  });

  it('does not let a busy dialog be dismissed out from under the parent', async () => {
    const fixture = await mountHost();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // `disableClose` is bound to busy, so BrnDialog unsubscribes its Escape handler and
    // the overlay cannot vanish while the parent still owns an in-flight action.
    expect(brnDialogOf(fixture).disableClose()).toBe(true);
  });
});
