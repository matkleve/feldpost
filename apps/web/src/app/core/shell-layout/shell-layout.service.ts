import { Injectable, computed, signal } from '@angular/core';
import { applySetOpen } from './shell-layout.helpers';
import { isShellPanelId, type ShellPanelId, type ShellPanelRow } from './shell-layout.types';

/**
 * Panel stack for the right rail. No canvas routing.
 * @see docs/specs/service/shell-layout/shell-layout.md
 */
@Injectable({ providedIn: 'root' })
export class ShellLayoutService {
  private readonly panels = signal<readonly ShellPanelRow[]>([]);

  readonly openPanels = computed(() =>
    this.panels()
      .filter((panel) => panel.open)
      .slice()
      .sort((a, b) => a.order - b.order),
  );

  isOpen(id: ShellPanelId): boolean {
    return this.panels().some((panel) => panel.id === id && panel.open);
  }

  orderOf(id: ShellPanelId): number {
    return this.panels().find((panel) => panel.id === id)?.order ?? 0;
  }

  open(id: ShellPanelId): void {
    this.setOpen(id, true);
  }

  close(id: ShellPanelId): void {
    this.setOpen(id, false);
  }

  setOpen(id: string, open: boolean): void {
    if (!isShellPanelId(id)) return;
    this.panels.update((current) => applySetOpen(current, id, open));
  }
}
