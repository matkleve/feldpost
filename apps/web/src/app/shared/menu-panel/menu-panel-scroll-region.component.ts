import { Component, input, output } from '@angular/core';
import {
  menuPanelScrollHostClasses,
  menuPanelScrollOverflowClasses,
  type MenuPanelScrollMode,
} from './menu-panel-scroll-mode';

/**
 * Scroll host for projected `[dropdown-items]` menu lists.
 * @see docs/specs/component/ui-primitives/menu-panel-scroll-region.md
 */
@Component({
  selector: 'app-menu-panel-scroll-region',
  standalone: true,
  template: `
    <div [class]="hostClass()" (scroll)="itemsScroll.emit()">
      <ng-content select="[dropdown-items]" />
    </div>
  `,
})
export class MenuPanelScrollRegionComponent {
  readonly scrollMode = input<MenuPanelScrollMode>('host');
  /** @deprecated Prefer `scrollMode`; merged into host classes when set. */
  readonly itemsClass = input('');

  readonly itemsScroll = output<void>();

  hostClass(): string {
    const overflow = menuPanelScrollOverflowClasses(this.scrollMode());
    const base = menuPanelScrollHostClasses(this.scrollMode(), this.itemsClass().trim());
    return `${base} ${overflow}`.replace(/\s+/g, ' ').trim();
  }
}
