import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { parseIsoDateValue } from '../../../core/i18n/date-field.helpers';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  CapturedDateEditorComponent,
  type DateSaveEvent,
} from '../../workspace-pane/media-detail/captured-date-editor.component';

@Component({
  selector: 'app-compact-date-field',
  standalone: true,
  imports: [CapturedDateEditorComponent],
  templateUrl: './compact-date-field.component.html',
  styleUrl: './compact-date-field.component.scss',
})
export class CompactDateFieldComponent {
  protected readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly label = input('');
  readonly value = input<Date | null>(null);
  readonly ariaLabel = input('');

  readonly valueChange = output<Date | null>();

  readonly calendarOpen = signal(false);

  readonly displayValue = computed(() => this.i18nService.formatDateFieldValue(this.value()));

  readonly placeholder = computed(() => this.i18nService.dateFieldPlaceholder());

  readonly editorInitialDate = computed(() => {
    const date = this.value();
    if (!date) {
      return '';
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  onTextCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.valueChange.emit(this.i18nService.parseDateFieldValue(raw));
  }

  toggleCalendar(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.calendarOpen.update((open) => !open);
  }

  closeCalendar(): void {
    this.calendarOpen.set(false);
  }

  onEditorSave(event: DateSaveEvent): void {
    const date = event.date ? parseIsoDateValue(event.date) : null;
    this.valueChange.emit(date);
    this.calendarOpen.set(false);
  }
}
