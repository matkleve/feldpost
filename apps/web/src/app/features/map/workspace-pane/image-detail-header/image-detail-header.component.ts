import { Component, ElementRef, effect, inject, input, output, viewChild } from '@angular/core';
import { ClickOutsideDirective } from '../../../../shared/click-outside.directive';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-image-detail-header',
  standalone: true,
  imports: [ClickOutsideDirective],
  templateUrl: './image-detail-header.component.html',
  styleUrl: '../image-detail-view.component.scss',
})
export class ImageDetailHeaderComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  private readonly contextMenuTriggerRef =
    viewChild<ElementRef<HTMLButtonElement>>('contextMenuTrigger');
  private readonly contextMenuPanelRef = viewChild<ElementRef<HTMLElement>>('contextMenuPanel');

  readonly displayTitle = input.required<string>();
  readonly titleValue = input<string>('');
  readonly mediaTypeLabel = input.required<string>();
  readonly editingTitle = input(false);
  readonly showContextMenu = input(false);

  readonly closed = output<void>();
  readonly titleEditRequested = output<void>();
  readonly titleSaveRequested = output<string>();
  readonly titleEditCancelled = output<void>();
  readonly contextMenuToggled = output<void>();
  readonly contextMenuClosed = output<void>();
  readonly deleteRequested = output<void>();
  readonly copyCoordinatesRequested = output<void>();

  constructor() {
    effect(() => {
      if (this.showContextMenu()) {
        this.focusFirstContextMenuItem();
      }
    });
  }

  onContextMenuToggleRequested(): void {
    this.contextMenuToggled.emit();
  }

  onContextMenuCloseRequested(): void {
    this.contextMenuClosed.emit();
    this.focusContextMenuTrigger();
  }

  onContextMenuKeydown(event: KeyboardEvent): void {
    if (!this.isNavigationKey(event.key)) {
      return;
    }

    const container = event.currentTarget as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusableItems = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.dd-item:not(:disabled)'),
    );

    if (focusableItems.length === 0) {
      return;
    }

    event.preventDefault();

    if (this.focusBoundaryItem(event.key, focusableItems)) {
      return;
    }

    this.focusAdjacentItem(event.key, focusableItems);
  }

  private focusFirstContextMenuItem(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const firstItem =
        this.contextMenuPanelRef()?.nativeElement.querySelector<HTMLButtonElement>('.dd-item');
      firstItem?.focus();
    });
  }

  private focusContextMenuTrigger(): void {
    this.contextMenuTriggerRef()?.nativeElement.focus();
  }

  private isNavigationKey(key: string): boolean {
    return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End';
  }

  private focusBoundaryItem(key: string, focusableItems: HTMLButtonElement[]): boolean {
    if (key === 'Home') {
      focusableItems[0]?.focus();
      return true;
    }

    if (key === 'End') {
      focusableItems[focusableItems.length - 1]?.focus();
      return true;
    }

    return false;
  }

  private focusAdjacentItem(key: string, focusableItems: HTMLButtonElement[]): void {
    const activeIndex = focusableItems.findIndex((item) => item === document.activeElement);
    const fallbackIndex = key === 'ArrowDown' ? -1 : 0;
    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const delta = key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + focusableItems.length) % focusableItems.length;
    focusableItems[nextIndex]?.focus();
  }
}
