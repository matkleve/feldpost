import { ElementRef, signal, type WritableSignal } from '@angular/core';

export const TWO_STEP_CONFIRM_REVERT_MS = 5000;
const TWO_STEP_OUTSIDE_CLICK_GRACE_MS = 200;

/** Shared arm → confirm → auto-disarm FSM for inline destructive controls. */
export class TwoStepConfirmInteraction {
  readonly armed: WritableSignal<boolean> = signal(false);

  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreOutsideUntil = 0;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  destroy(): void {
    this.clearRevertTimer();
  }

  handlePointerDown(event: PointerEvent): void {
    event.stopPropagation();
  }

  handleClick(event: MouseEvent, onConfirm: () => void, disabled = false): void {
    event.stopPropagation();
    if (disabled) {
      return;
    }
    if (!this.armed()) {
      this.arm();
      return;
    }
    this.disarm();
    onConfirm();
  }

  handleDocumentClick(event: MouseEvent): void {
    if (!this.armed() || Date.now() < this.ignoreOutsideUntil) {
      return;
    }
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (this.host.nativeElement.contains(target)) {
      return;
    }
    this.disarm();
  }

  disarm(): void {
    this.armed.set(false);
    this.clearRevertTimer();
  }

  private arm(): void {
    this.armed.set(true);
    this.ignoreOutsideUntil = Date.now() + TWO_STEP_OUTSIDE_CLICK_GRACE_MS;
    this.scheduleRevert();
  }

  private scheduleRevert(): void {
    this.clearRevertTimer();
    this.revertTimer = setTimeout(() => this.disarm(), TWO_STEP_CONFIRM_REVERT_MS);
  }

  private clearRevertTimer(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }
}

/** One armed destructive action at a time (context action bar section list). */
export class TwoStepConfirmGroup<TId extends string = string> {
  readonly armedId: WritableSignal<TId | null> = signal(null);

  private revertTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreOutsideUntil = 0;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  destroy(): void {
    this.clearRevertTimer();
  }

  handleClick(actionId: TId, onConfirm: () => void): void {
    if (this.armedId() !== actionId) {
      this.arm(actionId);
      return;
    }
    this.disarm();
    onConfirm();
  }

  handleDocumentClick(event: MouseEvent): void {
    if (!this.armedId() || Date.now() < this.ignoreOutsideUntil) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || this.host.nativeElement.contains(target)) {
      return;
    }
    this.disarm();
  }

  isArmed(actionId: TId): boolean {
    return this.armedId() === actionId;
  }

  disarm(): void {
    this.armedId.set(null);
    this.clearRevertTimer();
  }

  private arm(actionId: TId): void {
    this.armedId.set(actionId);
    this.ignoreOutsideUntil = Date.now() + TWO_STEP_OUTSIDE_CLICK_GRACE_MS;
    this.scheduleRevert();
  }

  private scheduleRevert(): void {
    this.clearRevertTimer();
    this.revertTimer = setTimeout(() => this.disarm(), TWO_STEP_CONFIRM_REVERT_MS);
  }

  private clearRevertTimer(): void {
    if (this.revertTimer !== null) {
      clearTimeout(this.revertTimer);
      this.revertTimer = null;
    }
  }
}
