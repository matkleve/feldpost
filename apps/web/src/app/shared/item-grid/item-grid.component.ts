import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
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
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class ItemGridComponent {
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly role = input<string | null>(null);
  /** Visible item order for Ctrl/Cmd+A and shift-range scope within this grid. */
  readonly orderedItemIds = input<readonly string[]>([]);

  private readonly selectionService = inject(WorkspaceSelectionService);
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('app-media-item[data-has-item="true"] .media-item__slot')) {
      return;
    }

    if (target.closest('app-media-item[data-has-item="true"] .media-item__surface--row')) {
      return;
    }

    if (!this.hostEl.nativeElement.contains(target)) {
      return;
    }

    this.selectionService.clearSelection();
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      if (this.selectionService.selectedCount() > 0) {
        event.preventDefault();
        this.selectionService.clearSelection();
      }
      return;
    }

    if (key !== 'a' || !(event.ctrlKey || event.metaKey) || event.shiftKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node) || !this.hostEl.nativeElement.contains(target)) {
      return;
    }

    const ids = this.orderedItemIds();
    if (ids.length === 0) {
      return;
    }

    event.preventDefault();
    this.selectionService.selectAllInScope([...ids]);
    const lastId = ids[ids.length - 1];
    if (lastId) {
      this.selectionService.setRangeAnchor(lastId);
    }
  }
}
