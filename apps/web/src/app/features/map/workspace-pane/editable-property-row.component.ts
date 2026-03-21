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

import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  UiInlineEditActionsDirective,
  UiInlineEditRowDirective,
  UiInputControlDirective,
  UiSelectControlDirective,
} from '../../../shared/ui-primitives.directive';

export interface SelectOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-editable-property-row',
  standalone: true,
  template: `
    <div
      uiInlineEditRow
      class="prop-row ui-inline-edit-row"
      [class.prop-row--editing]="editing()"
      [class.prop-row--readonly]="readonly()"
    >
      <span class="prop-key" [title]="label()">{{ label() }}</span>
      <div uiInlineEditActions class="prop-edit ui-inline-edit-actions">
        @if (editing() && !readonly()) {
          @switch (inputType()) {
            @case ('date') {
              <input
                #editInput
                uiInputControl
                class="prop-input ui-input-control"
                type="datetime-local"
                [value]="dateInputValue()"
                [attr.aria-label]="
                  t('workspace.editableRow.action.editPrefix', 'Edit') + ' ' + label()
                "
                (keydown.enter)="commitEdit($event)"
                (keydown.escape)="cancelEdit()"
                (blur)="commitEdit($event)"
              />
            }
            @case ('select') {
              <select
                #editInput
                uiSelectControl
                class="prop-input prop-input--select ui-select-control"
                [attr.aria-label]="
                  t('workspace.editableRow.action.editPrefix', 'Edit') + ' ' + label()
                "
                (change)="commitSelect($event)"
                (keydown.escape)="cancelEdit()"
                (blur)="commitSelect($event)"
              >
                <option value="">{{ t('workspace.editableRow.option.none', '— None —') }}</option>
                @for (opt of options(); track opt.id) {
                  <option [value]="opt.id" [selected]="opt.id === value()">{{ opt.label }}</option>
                }
              </select>
            }
            @default {
              <input
                #editInput
                uiInputControl
                class="prop-input ui-input-control"
                type="text"
                [value]="value()"
                [attr.aria-label]="
                  t('workspace.editableRow.action.editPrefix', 'Edit') + ' ' + label()
                "
                (keydown.enter)="commitEdit($event)"
                (keydown.escape)="cancelEdit()"
                (blur)="commitEdit($event)"
              />
            }
          }
        } @else {
          <button
            class="prop-value"
            type="button"
            [title]="
              readonly()
                ? label()
                : t('workspace.editableRow.action.editPrefix', 'Edit') + ' ' + label()
            "
            [disabled]="readonly()"
            (click)="startEdit()"
          >
            {{ displayValue() || t('workspace.editableRow.value.empty', '—') }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .prop-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-items: center;
        min-height: 2.5rem;
        padding-block: var(--spacing-2);
        padding-inline: var(--spacing-3);
        gap: var(--spacing-2);
        border-bottom: 1px solid var(--color-border);
        transition: background 80ms ease-out;

        &:hover:not(.prop-row--readonly),
        &--editing {
          background: color-mix(in srgb, var(--color-bg-base) 60%, transparent);
        }

        &--readonly {
          pointer-events: none;
        }
      }

      .prop-edit {
        justify-self: end;
        width: 100%;
      }

      .prop-key {
        font-size: 0.8125rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .prop-value {
        font-size: 0.9375rem;
        color: var(--color-text-primary);
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        background: none;
        border: none;
        border-bottom: 1px dashed transparent;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        line-height: 1.55;
        width: 100%;
        transition:
          border-color 80ms ease-out,
          color 80ms ease-out;

        &:hover:not(:disabled) {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        &:disabled {
          cursor: default;
          opacity: 0.7;
        }
      }

      .prop-input {
        font-size: 0.9375rem;
        color: var(--color-text-primary);
        background: transparent;
        border: none;
        border-radius: var(--radius-sm);
        padding: 0;
        width: 100%;
        text-align: right;
        font-family: inherit;

        &--select {
          cursor: pointer;
          appearance: auto;
        }
      }
    `,
  ],
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
