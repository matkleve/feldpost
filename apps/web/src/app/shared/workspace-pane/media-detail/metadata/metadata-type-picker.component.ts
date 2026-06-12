import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../../dropdown-trigger/shell/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';
import type { MetadataComposeValueType } from '../../../../core/metadata/metadata-validation.helpers';
import {
  METADATA_COMPOSE_TYPE_ICONS,
  METADATA_COMPOSE_TYPE_ORDER,
} from './metadata-type-icons';

@Component({
  selector: 'app-metadata-type-picker',
  standalone: true,
  imports: [DropdownShellComponent, ...HLM_BUTTON_IMPORTS],
  template: `
    <button
      #triggerRef
      hlmBtn
      variant="outline"
      size="sm"
      type="button"
      class="metadata-type-picker__trigger"
      [class.metadata-type-picker__trigger--open]="open()"
      [disabled]="disabled() || locked()"
      [attr.aria-label]="typePickerAriaLabel()"
      [attr.aria-expanded]="open()"
      (click)="toggleOpen()"
    >
      <span class="material-icons metadata-type-picker__icon" aria-hidden="true">{{
        iconFor(valueType())
      }}</span>
    </button>
    @if (open()) {
      <app-dropdown-shell
        class="address-search-shell metadata-type-picker__shell"
        panelClass="option-menu-surface address-search-panel"
        [anchor]="triggerEl()"
        [minWidth]="panelMinWidth()"
        [outsideCloseEnabled]="false"
        (closeRequested)="close()"
      >
        <div
          class="address-search__dropdown address-field-combobox__dropdown option-menu-list metadata-type-picker__dropdown"
          role="listbox"
        >
          @for (type of types; track type) {
            <button
              type="button"
              class="metadata-type-picker__result-item"
              (mousedown)="$event.preventDefault()"
              (click)="selectType(type)"
            >
              <span class="material-icons metadata-type-picker__result-icon" aria-hidden="true">{{
                iconFor(type)
              }}</span>
              <span class="metadata-type-picker__result-label min-w-0">{{ typeLabel(type) }}</span>
            </button>
          }
        </div>
      </app-dropdown-shell>
    }
  `,
  styleUrl: './metadata-type-picker.component.scss',
  host: {
    class: 'metadata-type-picker relative inline-flex shrink-0',
  },
})
export class MetadataTypePickerComponent {
  private readonly i18nService = inject(I18nService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly valueType = input.required<MetadataComposeValueType>();
  readonly locked = input(false);
  readonly disabled = input(false);
  readonly open = input(false);

  readonly openChange = output<boolean>();
  readonly valueTypeChange = output<MetadataComposeValueType>();

  readonly types = METADATA_COMPOSE_TYPE_ORDER;

  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('triggerRef');
  readonly triggerEl = signal<HTMLElement | null>(null);

  readonly panelMinWidth = computed(
    () => this.triggerRef()?.nativeElement.getBoundingClientRect().width ?? 40,
  );

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

  typePickerAriaLabel(): string {
    return `${this.t('workspace.metadata.typePicker.aria', 'Property type')}: ${this.typeLabel(this.valueType())}`;
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

  toggleOpen(): void {
    if (this.disabled() || this.locked()) return;
    const next = !this.open();
    if (next) {
      queueMicrotask(() => {
        const el = this.triggerRef()?.nativeElement ?? null;
        this.triggerEl.set(el);
      });
    }
    this.openChange.emit(next);
  }

  close(): void {
    this.openChange.emit(false);
  }

  selectType(type: MetadataComposeValueType): void {
    this.valueTypeChange.emit(type);
    this.close();
  }
}
