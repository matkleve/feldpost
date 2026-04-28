/**
 * MetadataPropertyRowComponent - metadata row with fixed action cells.
 */

import type { ElementRef } from '@angular/core';
import { Component, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  UiIconButtonGhostDirective,
  UiInputControlDirective,
  UiRowShellDirective,
  UiRowShellSizeSmDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

@Component({
  selector: 'app-metadata-property-row',
  standalone: true,
  imports: [
    UiIconButtonGhostDirective,
    UiInputControlDirective,
    UiRowShellDirective,
    UiRowShellSizeSmDirective,
  ],
  templateUrl: './metadata-property-row.component.html',
  styleUrl: './metadata-property-row.component.scss',
})
export class MetadataPropertyRowComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly metaKey = input.required<string>({ alias: 'key' });
  readonly metaValue = input.required<string>({ alias: 'value' });
  readonly valueChanged = output<string>();
  readonly deleteRequested = output<void>();

  readonly editing = signal(false);

  private readonly editInputRef = viewChild<ElementRef<HTMLInputElement>>('editInput');

  startEdit(): void {
    this.editing.set(true);
    queueMicrotask(() => this.editInputRef()?.nativeElement.focus());
  }

  commitEdit(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = input.value.trim();
    this.valueChanged.emit(newValue);
    this.editing.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }
}

