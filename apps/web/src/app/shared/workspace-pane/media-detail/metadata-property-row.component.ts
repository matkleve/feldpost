/**
 * MetadataPropertyRowComponent - metadata row with fixed action cells.
 */

import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { HLM_BUTTON_IMPORTS } from '../../../shared/ui/button';
import { HLM_INPUT_IMPORTS } from '../../../shared/ui/input';

@Component({
  selector: 'app-metadata-property-row',
  standalone: true,
  imports: [
    ...HLM_BUTTON_IMPORTS,
    ...HLM_INPUT_IMPORTS,
  ],
  templateUrl: './metadata-property-row.component.html',
  styleUrls: ['./metadata-property-row.component.scss', './_detail-row-slots.scss'],
})
export class MetadataPropertyRowComponent {
  private readonly i18nService = inject(I18nService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
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

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.editing()) {
      return;
    }

    const target = event.target as Node | null;
    if (!target || this.elementRef.nativeElement.contains(target)) {
      return;
    }

    this.editInputRef()?.nativeElement.blur();
  }

  commitEditFromSave(): void {
    const input = this.editInputRef()?.nativeElement;
    if (!input) {
      return;
    }
    this.commitEdit({ target: input } as unknown as Event);
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

