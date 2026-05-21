import {
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../../../dropdown-trigger/dropdown-shell.component';
import { HLM_BUTTON_IMPORTS } from '../../../ui/button';
import { HlmMenuItemDirective } from '../../../ui/menu';
import type { MetadataComposeValueType } from '../../../../core/metadata/metadata-validation.helpers';
import {
  METADATA_COMPOSE_TYPE_ICONS,
  METADATA_COMPOSE_TYPE_ORDER,
} from './metadata-type-icons';

@Component({
  selector: 'app-metadata-type-picker',
  standalone: true,
  imports: [DropdownShellComponent, HlmMenuItemDirective, ...HLM_BUTTON_IMPORTS],
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
      [attr.aria-label]="t('workspace.metadata.typePicker.aria', 'Property type')"
      [attr.aria-expanded]="open()"
      (click)="toggleOpen()"
    >
      <span
        class="material-icons metadata-type-picker__icon"
        aria-hidden="true"
        >{{ iconFor(valueType()) }}</span
      >
    </button>
    @if (open()) {
      <app-dropdown-shell
        panelClass="option-menu-surface"
        [anchor]="triggerEl()"
        [minWidth]="40"
        (closeRequested)="close()"
      >
        @for (type of types; track type) {
          <button
            hlmMenuItem
            type="button"
            class="metadata-type-picker__option w-full"
            (click)="selectType(type)"
          >
            <span class="material-icons option-menu-item__icon" aria-hidden="true">{{
              iconFor(type)
            }}</span>
            <span>{{ typeLabel(type) }}</span>
          </button>
        }
      </app-dropdown-shell>
    }
  `,
  styleUrl: './metadata-type-picker.component.scss',
  host: {
    class: 'metadata-type-picker relative shrink-0',
  },
})
export class MetadataTypePickerComponent {
  private readonly i18nService = inject(I18nService);
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
