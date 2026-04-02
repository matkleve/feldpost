import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ItemDisplayMode } from './item.component';

@Component({
  selector: 'app-item-grid',
  imports: [],
  templateUrl: './item-grid.component.html',
  styleUrl: './item-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemGridComponent {
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly role = input<string | null>(null);
}
