import { Component, inject, input, signal, output } from '@angular/core';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  CdkDropList,
  CdkDropListGroup,
  CdkDrag,
  CdkDragHandle,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { StandardDropdownComponent } from './standard-dropdown.component';
import { I18nService } from '../../core/i18n/i18n.service';
import { UiIconButtonGhostDirective } from '../ui-primitives/ui-primitives.directive';

export interface GroupingProperty {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-grouping-dropdown',
  templateUrl: './grouping-dropdown.component.html',
  styleUrl: './grouping-dropdown.component.scss',
  imports: [
    StandardDropdownComponent,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    UiIconButtonGhostDirective,
  ],
})
export class GroupingDropdownComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  // State owned by parent (WorkspaceToolbarComponent) — passed in as inputs
  readonly activeGroupings = input<GroupingProperty[]>([]);
  readonly availableProperties = input<GroupingProperty[]>([]);

  // Outputs
  readonly groupingsChanged = output<{
    active: GroupingProperty[];
    available: GroupingProperty[];
  }>();
  readonly dragStarted = output<void>();
  readonly dragEnded = output<void>();

  // Local UI state
  readonly selectedRows = signal<Set<string>>(new Set());
  readonly isDragging = signal(false);

  onDragStart(): void {
    this.isDragging.set(true);
    this.dragStarted.emit();
  }

  onDragEnd(): void {
    this.isDragging.set(false);
    this.dragEnded.emit();
  }

  onRowClick(propertyId: string, event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      this.selectedRows.update((set) => {
        const next = new Set(set);
        if (next.has(propertyId)) {
          next.delete(propertyId);
        } else {
          next.add(propertyId);
        }
        return next;
      });
      return;
    }

    // Plain click: clear selection, toggle between sections
    this.selectedRows.set(new Set());
    const isAvailable = this.availableProperties().some((p) => p.id === propertyId);
    const isActive = this.activeGroupings().some((p) => p.id === propertyId);
    if (isAvailable) {
      this.activate(propertyId);
    } else if (isActive) {
      this.deactivate(propertyId);
    }
  }

  onDrop(event: CdkDragDrop<GroupingProperty[]>): void {
    const selected = this.selectedRows();

    if (selected.size > 1 && selected.has(event.item.data.id)) {
      this.dropMultiSelect(event, selected);
    } else {
      this.dropSingle(event);
    }

    this.selectedRows.set(new Set());
  }

  private dropSingle(event: CdkDragDrop<GroupingProperty[]>): void {
    const active = [...this.activeGroupings()];
    const available = [...this.availableProperties()];

    if (event.previousContainer === event.container) {
      // Reorder within same section
      const isActive = active.some((p) => p.id === event.item.data.id);
      const list = isActive ? active : available;
      moveItemInArray(list, event.previousIndex, event.currentIndex);
    } else {
      // Cross-section transfer
      const isFromActive = active.some((p) => p.id === event.item.data.id);
      if (isFromActive) {
        transferArrayItem(active, available, event.previousIndex, event.currentIndex);
      } else {
        transferArrayItem(available, active, event.previousIndex, event.currentIndex);
      }
    }

    this.groupingsChanged.emit({ active, available });
  }

  private dropMultiSelect(event: CdkDragDrop<GroupingProperty[]>, selected: Set<string>): void {
    const active = [...this.activeGroupings()];
    const available = [...this.availableProperties()];

    const selectedFromActive = active.filter((p) => selected.has(p.id));
    const selectedFromAvailable = available.filter((p) => selected.has(p.id));
    const allSelected = [...selectedFromActive, ...selectedFromAvailable];

    const remainingActive = active.filter((p) => !selected.has(p.id));
    const remainingAvailable = available.filter((p) => !selected.has(p.id));

    if (event.previousContainer === event.container) {
      const targetIsActive = active.some((p) => p.id === event.item.data.id);
      if (targetIsActive) {
        remainingActive.splice(event.currentIndex, 0, ...allSelected);
      } else {
        remainingAvailable.splice(event.currentIndex, 0, ...allSelected);
      }
    } else {
      const fromActive = active.some((p) => p.id === event.item.data.id);
      if (fromActive) {
        remainingAvailable.splice(event.currentIndex, 0, ...allSelected);
      } else {
        remainingActive.splice(event.currentIndex, 0, ...allSelected);
      }
    }

    this.groupingsChanged.emit({ active: remainingActive, available: remainingAvailable });
  }

  private activate(propertyId: string): void {
    const active = [...this.activeGroupings()];
    const available = [...this.availableProperties()];
    const idx = available.findIndex((p) => p.id === propertyId);
    if (idx === -1) return;
    const [prop] = available.splice(idx, 1);
    active.push(prop);
    this.groupingsChanged.emit({ active, available });
  }

  private deactivate(propertyId: string): void {
    const active = [...this.activeGroupings()];
    const available = [...this.availableProperties()];
    const idx = active.findIndex((p) => p.id === propertyId);
    if (idx === -1) return;
    const [prop] = active.splice(idx, 1);
    available.push(prop);
    this.groupingsChanged.emit({ active, available });
  }

  clearGroupings(): void {
    const available = [...this.availableProperties(), ...this.activeGroupings()];
    this.selectedRows.set(new Set());
    this.groupingsChanged.emit({ active: [], available });
  }
}
