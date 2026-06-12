import { Component, input, output } from '@angular/core';
import { HlmMenuItemDirective } from '../ui/menu';

/**
 * Ghost footer action row for menu panels (e.g. “New project”, “Add filter”).
 * @see docs/specs/component/ui-primitives/menu-panel-footer-action.md
 */
@Component({
  selector: 'app-menu-panel-footer-action',
  standalone: true,
  imports: [HlmMenuItemDirective],
  template: `
    <div
      class="flex w-full min-w-0 shrink-0 flex-col items-stretch justify-stretch [&>button]:w-full"
    >
      <button
        hlmMenuItem
        class="flex min-w-0 shrink-0 items-center justify-start text-muted-foreground"
        type="button"
        (click)="actionRequested.emit()"
      >
        <span class="material-icons option-menu-item__icon" aria-hidden="true">{{ actionIcon() }}</span>
        {{ actionLabel() }}
      </button>
    </div>
  `,
})
export class MenuPanelFooterActionComponent {
  readonly actionLabel = input.required<string>();
  readonly actionIcon = input('add');
  readonly actionRequested = output<void>();
}
