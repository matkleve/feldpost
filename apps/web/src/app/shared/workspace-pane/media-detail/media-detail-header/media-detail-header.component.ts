import {
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  output,
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

  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);
  private readonly contextMenuTriggerRef =
    viewChild<ElementRef<HTMLButtonElement>>('contextMenuTrigger');
  readonly contextMenuAnchor = computed(
    () => this.contextMenuTriggerRef()?.nativeElement ?? null,
  );

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

  private focusFirstContextMenuItem(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const firstItem = this.contextMenuTriggerRef()?.nativeElement
        .closest('[data-detail-header]')
        ?.querySelector('app-dropdown-shell button[role="menuitem"]') as HTMLButtonElement | null;
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
