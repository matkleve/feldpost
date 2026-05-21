import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { MetadataPropertyRowComponent } from '../metadata-property-row.component';
import type { MetadataEntry, MetadataKeyDefinitionView } from '../media-detail-view.types';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MetadataService } from '../../../../core/metadata/metadata.service';
import { MetadataTypePickerComponent } from '../metadata/metadata-type-picker.component';
import { MetadataPropertyPickerComponent } from '../metadata/metadata-property-picker.component';
import { MetadataValueEditorComponent } from '../metadata/metadata-value-editor.component';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';
import {
  toMetadataComposeValueType,
  type MetadataComposeValueType,
} from '../../../../core/metadata/metadata-validation.helpers';
import {
  createEmptyMetadataAddDraft,
  isDuplicateOnImage,
  buildExcludedKeyIds,
  type MetadataAddDraft,
} from './metadata-add-draft';
import { METADATA_COMPOSE_TYPE_ICONS } from '../metadata/metadata-type-icons';

@Component({
  selector: 'app-metadata-section',
  standalone: true,
  imports: [
    MetadataPropertyRowComponent,
    MetadataTypePickerComponent,
    MetadataPropertyPickerComponent,
    MetadataValueEditorComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './metadata-section.component.html',
  styleUrls: ['./metadata-section.component.scss', '../_detail-row-slots.scss'],
})
export class MetadataSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly metadataService = inject(MetadataService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly entries = input<MetadataEntry[]>([]);
  readonly metadataKeyDefinitions = input<MetadataKeyDefinitionView[]>([]);

  readonly valueChanged = output<{ entry: MetadataEntry; newValue: string }>();
  readonly entryRemoved = output<MetadataEntry>();
  readonly entryAdded = output<{
    keyName: string;
    keyType: MetadataComposeValueType;
    value: string;
  }>();

  readonly showAddForm = signal(false);
  readonly draft = signal<MetadataAddDraft>(createEmptyMetadataAddDraft());
  readonly openPanel = signal<'type' | 'property' | null>(null);
  readonly valueError = signal<string | null>(null);
  readonly duplicateError = signal<string | null>(null);

  readonly excludedKeyIds = () => buildExcludedKeyIds(this.entries());

  iconForType(type: MetadataComposeValueType): string {
    return METADATA_COMPOSE_TYPE_ICONS[type];
  }

  openAddForm(): void {
    this.draft.set(createEmptyMetadataAddDraft());
    this.valueError.set(null);
    this.duplicateError.set(null);
    this.openPanel.set(null);
    this.showAddForm.set(true);
  }

  cancelAdd(): void {
    this.discardDraft();
  }

  private discardDraft(): void {
    this.showAddForm.set(false);
    this.draft.set(createEmptyMetadataAddDraft());
    this.valueError.set(null);
    this.duplicateError.set(null);
    this.openPanel.set(null);
  }

  onTypeOpenChange(open: boolean): void {
    this.openPanel.set(open ? 'type' : null);
  }

  onPropertyOpenChange(open: boolean): void {
    this.openPanel.set(open ? 'property' : null);
  }

  onValueTypeChange(valueType: MetadataComposeValueType): void {
    const current = this.draft();
    this.draft.set({
      ...current,
      valueType,
      propertyMode: 'new',
      metadataKeyId: null,
    });
  }

  onDefinitionSelected(def: MetadataKeyDefinitionView): void {
    this.draft.set({
      ...this.draft(),
      propertyMode: 'existing',
      metadataKeyId: def.id,
      keyName: def.key_name,
      valueType: toMetadataComposeValueType(def.key_type),
    });
    this.duplicateError.set(null);
  }

  onDraftNameChange(name: string): void {
    this.draft.set({
      ...this.draft(),
      propertyMode: 'new',
      metadataKeyId: null,
      keyName: name,
    });
    this.duplicateError.set(null);
  }

  onDraftValueChange(value: string): void {
    this.draft.update((d) => ({ ...d, value }));
    this.valueError.set(null);
  }

  saveAdd(): void {
    const current = this.draft();
    const keyName = current.keyName.trim();
    if (!keyName) return;

    if (isDuplicateOnImage(current, this.entries())) {
      this.duplicateError.set(
        this.t(
          'workspace.metadata.validation.duplicateOnImage',
          'This property is already on this item',
        ),
      );
      return;
    }

    const validation = this.metadataService.validateMetadataValueForSave(
      current.valueType,
      current.value,
    );
    if (!validation.valid) {
      this.valueError.set(
        this.t(validation.errorKey ?? 'workspace.metadata.validation.value.required', validation.errorFallback ?? 'Value is required'),
      );
      return;
    }

    this.entryAdded.emit({
      keyName,
      keyType: current.valueType,
      value: validation.normalizedValue,
    });
    this.discardDraft();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.showAddForm()) return;

    const target = event.target as Node | null;
    if (!target) return;

    const addRow = this.elementRef.nativeElement.querySelector(
      '[data-detail-active-editor="metadata-add"]',
    );
    if (addRow?.contains(target)) return;

    this.discardDraft();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.showAddForm()) return;
    this.discardDraft();
  }
}
