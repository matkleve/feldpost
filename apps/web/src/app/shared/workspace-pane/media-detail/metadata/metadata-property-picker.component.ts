import {
  afterNextRender,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
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
  imports: [DropdownShellComponent],
  template: `
    <input
      #triggerRef
      type="text"
      class="detail-row__field-input w-full min-w-0"
      [disabled]="disabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="t('workspace.metadata.propertyPicker.aria', 'Property name')"
      [attr.aria-autocomplete]="'list'"
      (focus)="onFocus()"
      (blur)="onBlur()"
      (input)="onInput($event)"
    />
    @if (open()) {
      <app-dropdown-shell
        class="address-search-shell metadata-property-picker__shell"
        panelClass="option-menu-surface address-search-panel"
        [anchor]="shellAnchor()"
        [minWidth]="panelMinWidth()"
        [outsideCloseEnabled]="false"
        (closeRequested)="close()"
      >
        <div
          class="address-search__dropdown address-field-combobox__dropdown option-menu-list metadata-property-picker__dropdown"
          role="listbox"
        >
          @if (showCreateRow()) {
            <button
              type="button"
              class="metadata-property-picker__result-item"
              (mousedown)="$event.preventDefault()"
              (click)="selectCreate()"
            >
              <span class="metadata-property-picker__option-type" aria-hidden="true">
                <span class="material-icons metadata-property-picker__type-surface">add</span>
              </span>
              <span class="metadata-property-picker__result-label min-w-0">{{
                createRowLabel()
              }}</span>
            </button>
          }
          @for (def of filteredDefinitions(); track def.id) {
            <button
              type="button"
              class="metadata-property-picker__result-item"
              (mousedown)="$event.preventDefault()"
              (click)="selectDefinition(def)"
            >
              <span class="metadata-property-picker__option-type" aria-hidden="true">
                <span class="material-icons metadata-property-picker__type-surface">{{
                  iconFor(composeType(def.key_type))
                }}</span>
              </span>
              <span class="metadata-property-picker__result-label min-w-0">{{ def.key_name }}</span>
            </button>
          }
          @if (!showCreateRow() && filteredDefinitions().length === 0) {
            <div class="address-field-combobox__empty">
              {{ t('workspace.addressField.suggest.empty', 'No results') }}
            </div>
          }
        </div>
      </app-dropdown-shell>
    }
  `,
  styleUrls: ['./metadata-property-picker.component.scss', '../_detail-row-slots.scss'],
  host: {
    class: 'metadata-property-picker relative block min-w-0 w-full',
  },
})
export class MetadataPropertyPickerComponent {
  private readonly i18nService = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly panelAnchor = input<HTMLElement | null>(null);

  readonly definitions = input<MetadataKeyDefinitionView[]>([]);
  readonly excludedKeyIds = input<ReadonlySet<string>>(new Set());
  readonly valueType = input.required<MetadataComposeValueType>();
  readonly keyName = input('');
  readonly disabled = input(false);
  readonly open = input(false);

  readonly openChange = output<boolean>();
  readonly definitionSelected = output<MetadataKeyDefinitionView>();
  readonly draftNameChange = output<string>();

  readonly searchTerm = signal('');

  private readonly triggerRef = viewChild<ElementRef<HTMLInputElement>>('triggerRef');
  readonly shellAnchor = signal<HTMLElement | null>(null);

  readonly panelMinWidth = computed(() => {
    const anchor = this.panelAnchor() ?? this.triggerRef()?.nativeElement;
    return anchor?.getBoundingClientRect().width ?? 200;
  });

  constructor() {
    afterNextRender(() => this.focusInput());
    effect(() => {
      if (this.open()) {
        this.syncShellAnchor();
      }
    });
  }

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

  readonly createRowLabel = computed(() => {
    const raw = this.searchTerm().trim();
    const typeLabel = this.typeLabel(this.valueType());
    const template = this.t(
      'workspace.metadata.propertyPicker.create',
      'Create "{name}" ({type})',
    );
    return template.replaceAll('{name}', raw).replaceAll('{type}', typeLabel);
  });

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

  focusInput(): void {
    const el = this.triggerRef()?.nativeElement;
    if (!el || this.disabled()) return;
    el.focus();
  }

  private syncShellAnchor(): void {
    queueMicrotask(() => {
      this.shellAnchor.set(this.panelAnchor() ?? this.triggerRef()?.nativeElement ?? null);
    });
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || this.elementRef.nativeElement.contains(target)) {
      return;
    }
    this.close();
  }

  onFocus(): void {
    if (this.disabled()) return;
    const initial = this.keyName();
    this.applySearchTerm(initial);
    const el = this.triggerRef()?.nativeElement;
    if (el) {
      el.value = initial;
    }
    this.syncShellAnchor();
    if (!this.open()) {
      this.openChange.emit(true);
    }
  }

  onBlur(): void {
    this.close();
  }

  onInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.applySearchTerm(term);
    if (!this.open()) {
      this.openChange.emit(true);
    }
  }

  private applySearchTerm(term: string): void {
    this.searchTerm.set(term);
    this.cdr.detectChanges();
    this.draftNameChange.emit(term);
    this.syncShellAnchor();
  }

  close(): void {
    this.searchTerm.set(this.keyName());
    this.openChange.emit(false);
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
