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
import { HLM_BUTTON_IMPORTS } from '../../ui/button';
import type { MetadataValueType } from '../../../core/metadata/metadata.types';
import { MetadataValueEditorComponent } from './metadata/metadata-value-editor.component';
import { METADATA_COMPOSE_TYPE_ICONS } from './metadata/metadata-type-icons';
import type { MetadataComposeValueType } from '../../../core/metadata/metadata-validation.helpers';

@Component({
  selector: 'app-metadata-property-row',
  standalone: true,
  imports: [...HLM_BUTTON_IMPORTS, MetadataValueEditorComponent],
  templateUrl: './metadata-property-row.component.html',
  styleUrls: ['./metadata-property-row.component.scss', './_detail-row-slots.scss'],
})
export class MetadataPropertyRowComponent {
  private readonly i18nService = inject(I18nService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly metaKey = input.required<string>({ alias: 'key' });
  readonly keyType = input<MetadataValueType>('text', { alias: 'keyType' });
  readonly metaValue = input.required<string>({ alias: 'value' });
  readonly valueChanged = output<string>();
  readonly deleteRequested = output<void>();

  readonly editing = signal(false);
  readonly editValue = signal('');

  private readonly valueEditorHost = viewChild<ElementRef<HTMLElement>>('valueEditorHost');

  composeType(): MetadataComposeValueType {
    const type = this.keyType();
    return type === 'number' || type === 'date' ? type : 'text';
  }

  typeIcon(): string {
    return METADATA_COMPOSE_TYPE_ICONS[this.composeType()];
  }

  startEdit(): void {
    this.editValue.set(this.metaValue());
    this.editing.set(true);
    queueMicrotask(() => {
      const host = this.valueEditorHost()?.nativeElement;
      const input = host?.querySelector('input');
      input?.focus();
    });
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.editing()) return;

    const target = event.target as Node | null;
    if (!target || this.elementRef.nativeElement.contains(target)) return;

    this.commitEdit();
  }

  commitEditFromSave(): void {
    this.commitEdit();
  }

  commitEdit(): void {
    const newValue = this.editValue().trim();
    this.valueChanged.emit(newValue);
    this.editing.set(false);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  onEditValueChange(value: string): void {
    this.editValue.set(value);
  }
}
