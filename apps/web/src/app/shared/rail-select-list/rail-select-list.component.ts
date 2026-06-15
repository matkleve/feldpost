import { Component, input, output } from '@angular/core';
import { InlineConfirmActionComponent } from '../inline-confirm-action/inline-confirm-action.component';
import { HLM_BUTTON_IMPORTS } from '../ui/button';
import type {
  RailSelectListActionEvent,
  RailSelectListItem,
  RailSelectListLeading,
} from './rail-select-list.types';

@Component({
  selector: 'app-rail-select-list',
  standalone: true,
  imports: [InlineConfirmActionComponent, ...HLM_BUTTON_IMPORTS],
  templateUrl: './rail-select-list.component.html',
  styleUrl: './rail-select-list.component.scss',
  host: {
    class: 'rail-select-list-host',
    '[class.rail-select-list--compact]': 'compact()',
  },
})
export class RailSelectListComponent {
  readonly items = input<RailSelectListItem[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly loading = input(false);
  readonly compact = input(false);
  readonly listAriaLabel = input('List');
  readonly loadingMessage = input('Loading…');
  readonly emptyMessage = input('No items');

  readonly itemSelected = output<string>();
  readonly actionTriggered = output<RailSelectListActionEvent>();

  onItemClick(itemId: string): void {
    this.itemSelected.emit(itemId);
  }

  onActionClick(event: Event, itemId: string, actionId: string): void {
    event.stopPropagation();
    (event.currentTarget as HTMLElement | null)?.blur();
    this.actionTriggered.emit({ itemId, actionId });
  }

  onConfirmAction(itemId: string, actionId: string): void {
    this.actionTriggered.emit({ itemId, actionId });
  }

  leadingKind(item: RailSelectListItem): RailSelectListLeading['kind'] {
    return item.leading?.kind ?? 'none';
  }

  dotColor(item: RailSelectListItem): string {
    return item.leading?.kind === 'dot' ? item.leading.color : 'transparent';
  }

  avatarText(item: RailSelectListItem): string {
    return item.leading?.kind === 'avatar' ? item.leading.text : '';
  }

  avatarOnline(item: RailSelectListItem): boolean {
    return item.leading?.kind === 'avatar' ? !!item.leading.online : false;
  }

  iconName(item: RailSelectListItem): string {
    return item.leading?.kind === 'icon' ? item.leading.name : '';
  }
}
