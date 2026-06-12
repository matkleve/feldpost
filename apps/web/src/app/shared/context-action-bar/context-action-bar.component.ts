import { Component, input, output } from '@angular/core';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../ui/menu';
import type { ResolvedAction } from '../../core/action/action-types';

export type ContextActionBarVariant = 'footer' | 'section';

@Component({
  selector: 'app-context-action-bar',
  standalone: true,
  imports: [HlmMenuItemDirective, HlmMenuSeparatorDirective, ...HLM_BUTTON_IMPORTS],
  templateUrl: './context-action-bar.component.html',
  styleUrl: './context-action-bar.component.scss',
})
export class ContextActionBarComponent<TActionId extends string = string> {
  readonly actions = input<ReadonlyArray<ResolvedAction<TActionId>>>([]);
  readonly variant = input<ContextActionBarVariant>('section');
  readonly pending = input(false);
  readonly actionSelected = output<TActionId>();

  readonly primaryActions = () =>
    this.actions().filter(
      (action) => action.section === 'primary' || action.section === 'secondary',
    );

  readonly destructiveActions = () =>
    this.actions().filter((action) => action.section === 'destructive');

  hasDestructiveActions(): boolean {
    return this.destructiveActions().length > 0;
  }

  onActionClick(actionId: TActionId): void {
    this.actionSelected.emit(actionId);
  }
}
