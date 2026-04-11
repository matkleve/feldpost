import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ItemDisplayMode } from './item.component';

@Component({
  selector: 'app-item-grid',
  imports: [],
  templateUrl: './item-grid.component.html',
  styleUrl: './item-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.item-grid]': 'true',
    '[class.item-grid--grid-sm]': "mode() === 'grid-sm'",
    '[class.item-grid--grid-md]': "mode() === 'grid-md'",
    '[class.item-grid--grid-lg]': "mode() === 'grid-lg'",
    '[class.item-grid--row]': "mode() === 'row'",
    '[class.item-grid--card]': "mode() === 'card'",
    '[attr.role]': 'role()',
  },
})
export class ItemGridComponent {
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly role = input<string | null>(null);
}
