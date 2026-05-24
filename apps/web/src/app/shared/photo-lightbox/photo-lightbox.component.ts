import { Component, input, output, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { twMerge } from 'tailwind-merge';
import { dialogOverlayVariants, HLM_DIALOG_IMPORTS } from '../ui/dialog';

@Component({
  selector: 'app-photo-lightbox',
  standalone: true,
  imports: [...BrnDialogImports, ...HLM_DIALOG_IMPORTS],
  templateUrl: './photo-lightbox.component.html',
  styleUrl: './photo-lightbox.component.scss',
})
export class PhotoLightboxComponent {
  private readonly _brnDialog = viewChild(BrnDialog);

  readonly imageUrl = input.required<string>();
  readonly alt = input<string>('Photo');
  readonly closed = output<void>();

  /** Shared dialog scrim tokens + stronger opacity for fullscreen photo (CDK backdrop). */
  readonly lightboxBackdropClass = twMerge(dialogOverlayVariants(), 'bg-black/90 cursor-zoom-out');

  /** Full-screen flex panel receives letterbox clicks; CDK backdrop is underneath. */
  onPanelClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this._brnDialog()?.close();
    }
  }

  onBrnDialogClosed(): void {
    this.closed.emit();
  }
}
