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
import { parseIsoDateValue, toIsoDateValue } from '../../core/i18n/date-field.helpers';
import { I18nService } from '../../core/i18n/i18n.service';
import { DropdownShellComponent } from '../dropdown-trigger/shell/dropdown-shell.component';
import { CalendarPickerPanelComponent } from './calendar-picker-panel.component';
import type { CalendarDropdownValue, TimeMode } from './calendar-dropdown.types';

@Component({
  selector: 'app-calendar-dropdown',
  standalone: true,
  imports: [DropdownShellComponent, CalendarPickerPanelComponent],
  templateUrl: './calendar-dropdown.component.html',
  styleUrl: './calendar-dropdown.component.scss',
})
export class CalendarDropdownComponent {
  protected readonly i18nService = inject(I18nService);
  readonly t = (key: string, fallback = '') => this.i18nService.t(key, fallback);

  readonly label = input('');
  readonly ariaLabel = input('');
  readonly value = input<CalendarDropdownValue | null>(null);
  readonly timeMode = input<TimeMode>('dateOnly');
  readonly minDate = input<Date | null>(null);
  readonly maxDate = input<Date | null>(null);
  readonly disabledDates = input<ReadonlySet<string> | null>(null);
  readonly nullable = input(true);

  readonly valueChange = output<CalendarDropdownValue | null>();

  readonly popoverOpen = signal(false);
  readonly draft = signal<CalendarDropdownValue | null>(null);

  private readonly controlRef = viewChild<ElementRef<HTMLElement>>('control');

  readonly anchorEl = computed(() => this.controlRef()?.nativeElement ?? null);

  readonly shellDisplayText = computed(() => {
    const dateIso = this.value()?.date;
    if (!dateIso) {
      return '';
    }
    const parsed = parseIsoDateValue(dateIso);
    return parsed ? this.i18nService.formatDateFieldValue(parsed) : '';
  });

  readonly placeholder = computed(() => this.i18nService.dateFieldPlaceholder());

  onShellTextCommit(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = this.i18nService.parseDateFieldValue(raw);
    const date = parsed ? toIsoDateValue(parsed) : null;
    const time =
      this.timeMode() === 'dateOnly' ? null : (this.value()?.time ?? null);

    if (!date && !time) {
      this.valueChange.emit(null);
      return;
    }

    this.valueChange.emit({ date, time });
  }

  togglePopover(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.popoverOpen()) {
      this.closePopover(false);
      return;
    }

    this.draft.set(this.cloneValue(this.value()));
    this.popoverOpen.set(true);
  }

  onPopoverCloseRequested(): void {
    this.closePopover(false);
  }

  onDraftChange(next: CalendarDropdownValue | null): void {
    this.draft.set(next);
  }

  onPanelDone(): void {
    const next = this.normalizeDraft(this.draft());
    if (!this.isDraftValid(next)) {
      return;
    }
    this.valueChange.emit(next);
    this.closePopover(true);
  }

  onPanelClear(): void {
    this.valueChange.emit(null);
    this.closePopover(true);
  }

  private closePopover(_committed: boolean): void {
    this.popoverOpen.set(false);
    this.draft.set(null);
  }

  private cloneValue(value: CalendarDropdownValue | null): CalendarDropdownValue | null {
    if (!value) {
      return null;
    }
    return { date: value.date, time: value.time };
  }

  private normalizeDraft(draft: CalendarDropdownValue | null): CalendarDropdownValue | null {
    if (!draft?.date && !draft?.time) {
      return null;
    }
    if (this.timeMode() === 'dateOnly') {
      return draft?.date ? { date: draft.date, time: null } : null;
    }
    return draft;
  }

  private isDraftValid(draft: CalendarDropdownValue | null): boolean {
    if (!draft?.date) {
      return this.nullable();
    }
    return true;
  }
}
