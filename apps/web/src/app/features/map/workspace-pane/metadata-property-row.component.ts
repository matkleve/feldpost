/**
 * MetadataPropertyRowComponent - metadata row with fixed action cells.
 */

import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-metadata-property-row',
  standalone: true,
  template: `
    <div class="meta-row" [class.meta-row--editing]="editing()">
      <button
        class="detail-row-action detail-row-action--left"
        type="button"
        [attr.aria-label]="'Edit ' + metaKey()"
        [title]="'Edit ' + metaKey()"
        (click)="startEdit()"
      >
        <span class="material-icons" aria-hidden="true">edit</span>
      </button>

      <span class="meta-row__label" [title]="metaKey()">{{ metaKey() }}</span>

      @if (editing()) {
        <input
          #editInput
          class="meta-row__input"
          type="text"
          [value]="metaValue()"
          aria-label="Edit {{ metaKey() }}"
          (keydown.enter)="commitEdit($event)"
          (keydown.escape)="cancelEdit()"
          (blur)="commitEdit($event)"
        />
      } @else {
        <span class="meta-row__value" [title]="metaValue() || '-'">
          {{ metaValue() || '-' }}
        </span>
      }

      <button
        class="detail-row-action detail-row-action--right detail-row-action--danger"
        type="button"
        [attr.aria-label]="'Remove ' + metaKey()"
        title="Remove metadata"
        (click)="deleteRequested.emit()"
      >
        <span class="material-icons" aria-hidden="true">close</span>
      </button>
    </div>
  `,
  styles: [
    `
      .meta-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        align-items: center;
        min-height: 2rem;
        padding: var(--spacing-1) var(--spacing-2);
        gap: var(--spacing-2);
        border-radius: var(--radius-sm);
        transition: background 120ms ease-out;
        position: relative;
      }

      .meta-row:hover,
      .meta-row--editing {
        background: color-mix(in srgb, var(--color-clay) 8%, transparent);
      }

      .meta-row__label {
        font-size: 0.8125rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: color 120ms ease-out;
      }

      .meta-row__value {
        font-size: 0.9375rem;
        color: var(--color-text-primary);
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0;
        font-family: inherit;
        line-height: 1.55;
        width: 100%;
        transition: color 120ms ease-out;
      }

      .meta-row:hover .meta-row__label,
      .meta-row:hover .meta-row__value,
      .meta-row:focus-within .meta-row__label,
      .meta-row:focus-within .meta-row__value {
        color: var(--color-clay);
      }

      .detail-row-action {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--color-text-secondary);
        opacity: 1;
        pointer-events: auto;
        cursor: pointer;
        transition:
          color 120ms ease-out,
          background 120ms ease-out;
      }

      .detail-row-action .material-icons {
        font-size: 0.9375rem;
      }

      .detail-row-action--left {
        left: calc(var(--detail-row-rail-size) * -1 - var(--detail-row-rail-gap));
      }

      .detail-row-action--right {
        right: calc(var(--detail-row-rail-size) * -1 - var(--detail-row-rail-gap));
      }

      .meta-row:hover .detail-row-action,
      .meta-row:focus-within .detail-row-action {
        color: var(--color-clay);
      }

      .detail-row-action:hover {
        color: var(--color-text-primary);
        background: color-mix(in srgb, var(--color-clay) 8%, transparent);
      }

      .detail-row-action--danger:hover {
        color: var(--color-danger);
        background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      }

      .meta-row__input {
        font-size: 0.9375rem;
        color: var(--color-text-primary);
        background: var(--color-bg-surface);
        border: 1px solid var(--color-primary);
        border-radius: var(--radius-sm);
        padding: 0.125rem var(--spacing-2);
        width: 100%;
        text-align: right;
        font-family: inherit;
        outline: none;
        box-shadow: var(--shadow-focus);
      }
    `,
  ],
})
export class MetadataPropertyRowComponent {
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
