/**
 * EditablePropertyRowComponent — click-to-edit property row for image fields.
 *
 * Supports three input types:
 *  - 'text' — inline text input (default)
 *  - 'date' — datetime-local input
 *  - 'select' — dropdown with options
 *
 * Follows the Notion pattern: click the value → inline edit → commit on Enter/blur.
 * Escape discards changes.
 */

import type { ElementRef } from '@angular/core';
import { Component, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  UiInlineEditActionsDirective,
  UiInlineEditRowDirective,
  UiInputControlDirective,
  UiSelectControlDirective,
} from '../../shared/ui-primitives/ui-primitives.directive';

export interface SelectOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-editable-property-row',
  standalone: true,
  templateUrl: './editable-property-row.component.html',
  styleUrl: './editable-property-row.component.scss',
  imports: [
    UiInlineEditRowDirective,
    UiInlineEditActionsDirective,
    UiInputControlDirective,
    UiSelectControlDirective,
  ],
})
export class EditablePropertyRowComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly displayValue = input<string>('');
  readonly inputType = input<'text' | 'date' | 'select'>('text');
  readonly options = input<SelectOption[]>([]);
  readonly readonly = input(false);
  readonly valueChanged = output<string>();

  readonly editing = signal(false);

  private readonly editInputRef =
    viewChild<ElementRef<HTMLInputElement | HTMLSelectElement>>('editInput');

  /** Convert an ISO date string to datetime-local format for the input. */
  dateInputValue(): string {
    const v = this.value();
    if (!v) return '';
    try {
      const d = new Date(v);
      // datetime-local needs YYYY-MM-DDTHH:MM format (local time, not UTC)
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  startEdit(): void {
    if (this.readonly()) return;
    this.editing.set(true);
    queueMicrotask(() => this.editInputRef()?.nativeElement.focus());
  }

  commitEdit(event: Event): void {
    const input = event.target as HTMLInputElement;
    let newValue = input.value.trim();
    if (this.inputType() === 'date' && newValue) {
      // Convert datetime-local back to ISO string
      newValue = new Date(newValue).toISOString();
    }
    this.valueChanged.emit(newValue);
    this.editing.set(false);
  }

  commitSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.valueChanged.emit(select.value);
    this.editing.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }
}

