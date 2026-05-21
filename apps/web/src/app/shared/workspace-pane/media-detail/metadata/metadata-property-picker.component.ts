import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
import { StandardDropdownComponent } from '../../../dropdown-trigger/standard-dropdown.component';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';
import { HlmMenuItemDirective } from '../../../ui/menu';
import {
  normalizeMetadataKeyName,
  toMetadataComposeValueType,
  type MetadataComposeValueType,
} from '../../../../core/metadata/metadata-validation.helpers';
import type { MetadataKeyDefinitionView } from '../media-detail-view.types';
import { METADATA_COMPOSE_TYPE_ICONS } from './metadata-type-icons';

@Component({
  selector: 'app-metadata-property-picker',
  standalone: true,
  imports: [
    DropdownShellComponent,
    StandardDropdownComponent,
    ...HLM_BUTTON_IMPORTS,
    HlmMenuItemDirective,
  ],
  template: `
    <button
      #triggerRef
      type="button"
      class="detail-row__field-input detail-row__field-input--trigger metadata-property-picker__trigger w-full min-w-0"
      [disabled]="disabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="t('workspace.metadata.propertyPicker.aria', 'Property name')"
      (click)="toggleOpen()"
    >
      @if (showTriggerTypeIcon()) {
        <span class="material-icons metadata-property-picker__type-icon" aria-hidden="true">{{
          iconFor(displayType())
        }}</span>
      }
      <span class="metadata-property-picker__label min-w-0 truncate">{{
        displayLabel()
      }}</span>
    </button>
    @if (open()) {
      <app-dropdown-shell
        class="metadata-property-picker__shell"
        panelClass="option-menu-surface"
        [anchor]="triggerEl()"
        [minWidth]="panelMinWidth()"
        (closeRequested)="close()"
      >
        <app-standard-dropdown
          class="metadata-property-picker__dropdown"
          [showSearch]="true"
          [searchTerm]="searchTerm()"
          [searchPlaceholder]="
            t('workspace.metadata.propertyPicker.searchPlaceholder', 'Search or create property')
          "
          (searchTermChange)="onSearchTermChange($event)"
          (clearRequested)="onSearchTermChange('')"
        >
          <div dropdown-items class="metadata-property-picker__items w-full min-w-0">
            @if (showCreateRow()) {
              <button
                hlmMenuItem
                type="button"
                class="metadata-property-picker__create w-full"
                (click)="selectCreate()"
              >
                <span class="material-icons option-menu-item__icon" aria-hidden="true">add</span>
                <span class="min-w-0 flex-1 text-left">{{ createRowLabel() }}</span>
              </button>
            }
            @for (def of filteredDefinitions(); track def.id) {
              <button
                hlmMenuItem
                type="button"
                class="metadata-property-picker__option w-full"
                (click)="selectDefinition(def)"
              >
                <span class="material-icons option-menu-item__icon" aria-hidden="true">{{
                  iconFor(composeType(def.key_type))
                }}</span>
                <span class="metadata-property-picker__chip min-w-0 flex-1 text-left">{{
                  def.key_name
                }}</span>
              </button>
            }
          </div>
        </app-standard-dropdown>
      </app-dropdown-shell>
    }
  `,
  styleUrl: './metadata-property-picker.component.scss',
  host: {
    class: 'metadata-property-picker relative block min-w-0 w-full',
  },
})
export class MetadataPropertyPickerComponent {
  private readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly showTriggerTypeIcon = input(true);
  readonly definitions = input<MetadataKeyDefinitionView[]>([]);
  readonly excludedKeyIds = input<ReadonlySet<string>>(new Set());
  readonly valueType = input.required<MetadataComposeValueType>();
  readonly keyName = input('');
  readonly metadataKeyId = input<string | null>(null);
  readonly disabled = input(false);
  readonly open = input(false);

  readonly openChange = output<boolean>();
  readonly definitionSelected = output<MetadataKeyDefinitionView>();
  readonly draftNameChange = output<string>();

  readonly searchTerm = signal('');

  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('triggerRef');
  readonly triggerEl = signal<HTMLElement | null>(null);

  readonly panelMinWidth = computed(() => this.triggerRef()?.nativeElement.offsetWidth ?? 200);

  readonly filteredDefinitions = computed(() => {
    const query = normalizeMetadataKeyName(this.searchTerm());
    const excluded = this.excludedKeyIds();
    return this.definitions().filter((def) => {
      if (excluded.has(`id:${def.id}`)) return false;
      if (!query) return true;
      return normalizeMetadataKeyName(def.key_name).includes(query);
    });
  });

  readonly showCreateRow = computed(() => {
    const raw = this.searchTerm().trim();
    if (!raw) return false;
    const normalized = normalizeMetadataKeyName(raw);
    const type = this.valueType();
    return !this.definitions().some(
      (def) =>
        normalizeMetadataKeyName(def.key_name) === normalized &&
        def.key_type === type &&
        !this.excludedKeyIds().has(`id:${def.id}`),
    );
  });

  displayType(): MetadataComposeValueType {
    if (this.metadataKeyId()) {
      const match = this.definitions().find((d) => d.id === this.metadataKeyId());
      if (match) return toMetadataComposeValueType(match.key_type);
    }
    return this.valueType();
  }

  displayLabel(): string {
    const name = this.keyName().trim();
    if (name) return name;
    return this.t('workspace.metadata.propertyPicker.placeholder', 'Property name');
  }

  createRowLabel(): string {
    const raw = this.searchTerm().trim();
    const typeLabel = this.typeLabel(this.valueType());
    return this.t('workspace.metadata.propertyPicker.create', 'Create "{name}" ({type})')
      .replace('{name}', raw)
      .replace('{type}', typeLabel);
  }

  composeType(valueType: MetadataKeyDefinitionView['key_type']): MetadataComposeValueType {
    return toMetadataComposeValueType(valueType);
  }

  iconFor(type: MetadataComposeValueType): string {
    return METADATA_COMPOSE_TYPE_ICONS[type];
  }

  typeLabel(type: MetadataComposeValueType): string {
    switch (type) {
      case 'number':
        return this.t('workspace.metadata.type.number', 'Number');
      case 'date':
        return this.t('workspace.metadata.type.date', 'Date');
      default:
        return this.t('workspace.metadata.type.text', 'Text');
    }
  }

  toggleOpen(): void {
    if (this.disabled()) return;
    const next = !this.open();
    if (next) {
      this.searchTerm.set(this.keyName());
      queueMicrotask(() => {
        this.triggerEl.set(this.triggerRef()?.nativeElement ?? null);
      });
    }
    this.openChange.emit(next);
  }

  close(): void {
    this.openChange.emit(false);
  }

  onSearchTermChange(term: string): void {
    this.searchTerm.set(term);
    this.draftNameChange.emit(term.trim());
  }

  selectDefinition(def: MetadataKeyDefinitionView): void {
    this.definitionSelected.emit(def);
    this.close();
  }

  selectCreate(): void {
    this.draftNameChange.emit(this.searchTerm().trim());
    this.close();
  }
}
