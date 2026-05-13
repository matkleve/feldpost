import { Component, input, output } from '@angular/core';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
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
  readonly imageUrl = input.required<string>();
  readonly alt = input<string>('Photo');
  readonly closed = output<void>();

  /** Shared dialog scrim tokens + stronger opacity for fullscreen photo (CDK backdrop). */
  readonly lightboxBackdropClass = twMerge(dialogOverlayVariants(), 'bg-black/90 cursor-zoom-out');

  onBrnDialogClosed(): void {
    this.closed.emit();
  }
}
