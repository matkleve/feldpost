import { Component, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { twMerge } from 'tailwind-merge';
import { dialogOverlayVariants, HLM_DIALOG_IMPORTS } from '../ui/dialog';

/** Stable state: fit — image at 1× within viewport caps. @see docs/specs/component/media/photo-lightbox.md */
/** Stable state: zoomed — wheel scale above 1×; viewport may scroll. @see docs/specs/component/media/photo-lightbox.md */
export type PhotoLightboxVisualState = 'fit' | 'zoomed';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.12;
const ZOOM_EPSILON = 0.001;

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

  readonly zoomScale = signal(MIN_ZOOM);

  readonly visualState = computed<PhotoLightboxVisualState>(() =>
    this.zoomScale() > MIN_ZOOM + ZOOM_EPSILON ? 'zoomed' : 'fit',
  );

  readonly imageMaxWidth = computed(() => `calc(95vw * ${this.zoomScale()})`);
  readonly imageMaxHeight = computed(() => `calc(95vh * ${this.zoomScale()})`);

  /** Shared dialog scrim tokens + stronger opacity for fullscreen photo (CDK backdrop). */
  readonly lightboxBackdropClass = twMerge(dialogOverlayVariants(), 'bg-black/90 cursor-zoom-out');

  constructor() {
    effect(() => {
      this.imageUrl();
      this.zoomScale.set(MIN_ZOOM);
    });
  }

  /** Full-screen flex panel receives letterbox clicks; CDK backdrop is underneath. */
  onPanelClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this._brnDialog()?.close();
    }
  }

  /** Wheel over the image adjusts zoom; wheel on scrollable viewport chrome pans when zoomed. */
  onImageWheel(event: WheelEvent): void {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoomScale() + direction * ZOOM_STEP));
    if (Math.abs(next - this.zoomScale()) < ZOOM_EPSILON) {
      return;
    }
    this.zoomScale.set(next);
  }

  onBrnDialogClosed(): void {
    this.closed.emit();
  }
}
