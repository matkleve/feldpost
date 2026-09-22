import { Component, inject } from '@angular/core';
import { ShellLayoutService } from '../../core/shell-layout/shell-layout.service';
import type { ShellPanelId } from '../../core/shell-layout/shell-layout.types';

/** Third track. Hidden while nothing is open, so the shell gap is not doubled. */
@Component({
  selector: 'app-shell-panel-column',
  standalone: true,
  templateUrl: './shell-panel-column.component.html',
  styleUrl: './shell-panel-column.component.scss',
  host: {
    '[attr.data-empty]': 'openPanels().length === 0 ? "" : null',
  },
})
export class ShellPanelColumnComponent {
  private readonly shellLayout = inject(ShellLayoutService);

  readonly openPanels = this.shellLayout.openPanels;

  isOpen(id: ShellPanelId): boolean {
    return this.shellLayout.isOpen(id);
  }

  orderOf(id: ShellPanelId): number {
    return this.shellLayout.orderOf(id);
  }
}
