import {
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import type { ResolvedAction } from '../../../../core/action/action-types';
import type { WorkspaceSingleActionId } from '../../footer/workspace-detail-actions.types';

@Component({
  selector: 'app-media-detail-header',
  standalone: true,
  imports: [
    DropdownShellComponent,
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
    HlmMenuItemDirective,
    HlmMenuSeparatorDirective,
  ],
  templateUrl: './media-detail-header.component.html',
  styleUrl: './media-detail-header.component.scss',
})
export class MediaDetailHeaderComponent {
  private static readonly MENU_GAP_PX = 8;
  private static readonly MENU_MARGIN_PX = 8;
  private static readonly MENU_MIN_WIDTH_PX = 176;

  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  private readonly contextMenuTriggerRef =
    viewChild<ElementRef<HTMLButtonElement>>('contextMenuTrigger');
  private readonly contextMenuPanelRef = viewChild('contextMenuPanel', {
    read: ElementRef<HTMLElement>,
  });
  readonly contextMenuTop = signal(0);
  readonly contextMenuLeft = signal(0);

  readonly displayTitle = input<string>('');
  readonly titleValue = input<string>('');
  readonly editingTitle = input(false);
  readonly showContextMenu = input(false);
  readonly contextActions = input<ReadonlyArray<ResolvedAction<WorkspaceSingleActionId>>>([]);

  readonly closed = output<void>();
  readonly titleEditRequested = output<void>();
  readonly titleSaveRequested = output<string>();
  readonly titleEditCancelled = output<void>();
  readonly contextMenuToggled = output<void>();
  readonly contextMenuClosed = output<void>();
  readonly actionSelected = output<WorkspaceSingleActionId>();

  constructor() {
    effect(() => {
      if (this.showContextMenu()) {
        this.positionContextMenu();
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

    const currentTarget = event.currentTarget as HTMLElement | null;
    const container = currentTarget?.closest('[role="menu"]') as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusableItems = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)'),
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

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChanged(): void {
    if (!this.showContextMenu()) {
      return;
    }

    this.positionContextMenu();
  }

  private focusFirstContextMenuItem(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      this.positionContextMenu();
      const firstItem = this.contextMenuPanelRef()?.nativeElement.querySelector(
        'button[role="menuitem"]',
      ) as HTMLButtonElement | null;
      firstItem?.focus();
    });
  }

  private positionContextMenu(): void {
    const trigger = this.contextMenuTriggerRef()?.nativeElement;
    if (!trigger || typeof window === 'undefined') {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const panel = this.contextMenuPanelRef()?.nativeElement;
    const panelRect = panel?.getBoundingClientRect();
    const menuWidth = Math.max(
      MediaDetailHeaderComponent.MENU_MIN_WIDTH_PX,
      panelRect?.width ?? MediaDetailHeaderComponent.MENU_MIN_WIDTH_PX,
    );
    const menuHeight = panelRect?.height ?? 0;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = MediaDetailHeaderComponent.MENU_MARGIN_PX;
    const gap = MediaDetailHeaderComponent.MENU_GAP_PX;

    const preferredLeft = triggerRect.right - menuWidth;
    const maxLeft = Math.max(margin, viewportWidth - menuWidth - margin);
    const clampedLeft = Math.min(Math.max(preferredLeft, margin), maxLeft);

    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - gap - menuHeight;
    const shouldOpenAbove = menuHeight > 0 && belowTop + menuHeight > viewportHeight - margin;
    const preferredTop = shouldOpenAbove ? aboveTop : belowTop;
    const maxTop = Math.max(margin, viewportHeight - menuHeight - margin);
    const clampedTop = Math.min(Math.max(preferredTop, margin), maxTop);

    this.contextMenuLeft.set(Math.round(clampedLeft));
    this.contextMenuTop.set(Math.round(clampedTop));
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
