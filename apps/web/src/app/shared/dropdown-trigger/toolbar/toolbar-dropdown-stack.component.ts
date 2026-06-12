import { Component, input, output } from '@angular/core';
import { DropdownShellComponent } from '../shell/dropdown-shell.component';
import {
  toolbarDropdownPanelClass,
  toolbarDropdownPositionWidthPx,
} from './toolbar-menu-panel-layout';

/**
 * Shared toolbar menu shell + projection slot (parent supplies `@switch` body).
 * @see docs/specs/component/filters/dropdown-system.md
 */
@Component({
  selector: 'app-toolbar-dropdown-stack',
  standalone: true,
  imports: [DropdownShellComponent],
  template: `
    @if (activePanelId()) {
      <app-dropdown-shell
        [panelClass]="toolbarDropdownPanelClass(activePanelId())"
        [anchor]="anchor()"
        [minWidth]="toolbarDropdownPositionWidthPx(activePanelId())"
        [outsideCloseEnabled]="outsideCloseEnabled()"
        (closeRequested)="closeRequested.emit()"
      >
        <ng-content />
      </app-dropdown-shell>
    }
  `,
})
export class ToolbarDropdownStackComponent {
  readonly activePanelId = input<string | null>(null);
  readonly anchor = input<HTMLElement | null>(null);
  readonly outsideCloseEnabled = input(true);

  readonly closeRequested = output<void>();

  protected readonly toolbarDropdownPanelClass = toolbarDropdownPanelClass;
  protected readonly toolbarDropdownPositionWidthPx = toolbarDropdownPositionWidthPx;
}
