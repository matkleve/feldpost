import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { MetadataPropertyRowComponent } from '../metadata-property-row.component';
import type { MetadataEntry } from '../media-detail-view.types';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { HlmMenuItemDirective } from '../../../../shared/ui/menu';
import { HLM_INPUT_IMPORTS } from '../../../../shared/ui/input';

@Component({
  selector: 'app-metadata-section',
  standalone: true,
  imports: [MetadataPropertyRowComponent, HlmMenuItemDirective, ...HLM_INPUT_IMPORTS],
  templateUrl: './metadata-section.component.html',
  styleUrls: ['./metadata-section.component.scss', '../_detail-row-slots.scss'],
})
export class MetadataSectionComponent {
  private readonly i18nService = inject(I18nService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly entries = input<MetadataEntry[]>([]);
  readonly allKeyNames = input<string[]>([]);

  readonly valueChanged = output<{ entry: MetadataEntry; newValue: string }>();
  readonly entryRemoved = output<MetadataEntry>();
  readonly entryAdded = output<{ key: string; value: string }>();

  readonly showAddForm = signal(false);
  readonly keySuggestions = signal<string[]>([]);

  onMetadataKeyInput(query: string): void {
    if (!query.trim()) {
      this.keySuggestions.set([]);
      return;
    }

    const lower = query.toLowerCase();
    const existing = new Set(this.entries().map((m) => m.key.toLowerCase()));
    const matches = this.allKeyNames()
      .filter((k) => k.toLowerCase().includes(lower) && !existing.has(k.toLowerCase()))
      .slice(0, 5);

    this.keySuggestions.set(matches);
  }

  addMetadata(key: string, value: string): void {
    if (!key.trim() || !value.trim()) return;
    this.entryAdded.emit({ key: key.trim(), value: value.trim() });
    this.showAddForm.set(false);
    this.keySuggestions.set([]);
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.showAddForm()) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    const addRow = this.elementRef.nativeElement.querySelector(
      '[data-detail-active-editor="metadata-add"]',
    );
    if (addRow?.contains(target)) {
      return;
    }

    this.showAddForm.set(false);
    this.keySuggestions.set([]);
  }
}
