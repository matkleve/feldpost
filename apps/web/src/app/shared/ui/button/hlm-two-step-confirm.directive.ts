import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { TwoStepConfirmInteraction } from './destructive-confirm.interaction';

/**
 * Opt-in two-step confirm on `hlmBtn` — first click arms, second emits `twoStepConfirmed`.
 * Pair with `variant="destructive"` for delete actions or `variant="ghost"` for primary remove.
 */
@Directive({
  selector: 'button[hlmBtn][twoStepConfirm],button[hlmBtn][destructiveConfirm]',
  standalone: true,
  exportAs: 'hlmTwoStepConfirm',
  host: {
    '[attr.data-two-step-state]': 'armed() ? "armed" : "idle"',
  },
})
export class HlmTwoStepConfirmDirective implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly interaction = new TwoStepConfirmInteraction(this.host);

  readonly disabled = input(false);
  readonly twoStepConfirmed = output<void>();

  readonly armed = this.interaction.armed;

  ngOnDestroy(): void {
    this.interaction.destroy();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.interaction.handleDocumentClick(event);
  }

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    this.interaction.handlePointerDown(event);
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    this.interaction.handleClick(event, () => this.twoStepConfirmed.emit(), this.disabled());
  }
}
